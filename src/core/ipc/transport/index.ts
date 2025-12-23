import { ipcMain, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { Logger, ILogger } from '@/infrastructure/logger';
import type {
  EmptyFunc,
  IPCEventHandler,
  IPCHandleHandler,
  IpcResponse,
  IIpcTransport,
} from './ipc.type';

const emptyFunc: EmptyFunc = () => {};

/**
 * @internal This class is an internal implementation detail.
 * Please use `IpcRouter` for application-level IPC communication.
 */
export default class IpcTransport implements IIpcTransport {
  // 存储所有频道的回调函数 (用于清理)
  // Map<channel, Map<originalCallback, wrappedCallback>>
  private readonly channels: Map<
    string,
    Map<IPCEventHandler, (event: IpcMainEvent, ...args: unknown[]) => Promise<void>>
  > = new Map();
  private readonly handlers: Set<string> = new Set();

  // 日志实例
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || new Logger({ appName: 'IpcTransport' });
  }

  /**
   * Set custom logger
   * 设置自定义日志实例
   * @param logger - Logger instance
   */
  public setLogger(logger: ILogger): void {
    this.logger = logger;
  }

  /**
   * 注册监听事件 (ipcMain.on)
   * @param channel - 事件名称
   * @param cb - 回调函数
   */
  public on(channel: string, cb: IPCEventHandler = emptyFunc): void {
    // 包装回调函数以添加日志和错误处理
    const wrappedCb = async (event: IpcMainEvent, ...args: unknown[]) => {
      try {
        this.logEvent(channel, 'on', args);
        await cb(event, ...args);
      } catch (error) {
        this.logError(channel, 'on', error);
        // 尝试回传错误给发送者
        if (!event.sender.isDestroyed()) {
          event.sender.send(`${channel}:error`, this.serializeError(error));
        }
      }
    };

    // 存储回调引用
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Map());
    }
    this.channels.get(channel)!.set(cb, wrappedCb);

    ipcMain.on(channel, wrappedCb);
  }

  /**
   * 注册处理事件 (ipcMain.handle)
   * 注意: 同一个 channel 只能注册一个 handler，重复注册会覆盖之前的 handler
   * @param channel - 事件名称
   * @param cb - 回调函数
   */
  public handle(channel: string, cb: IPCHandleHandler = emptyFunc): void {
    // 确保先移除旧的 handler，防止 electron 抛出 "second handler" 错误
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel);
    }
    this.handlers.add(channel);

    // 包装回调函数以添加日志和错误处理
    const wrappedCb = async (
      event: IpcMainInvokeEvent,
      ...args: unknown[]
    ): Promise<IpcResponse> => {
      try {
        this.logEvent(channel, 'handle', args);
        const result = await cb(event, ...args);

        // Wrap result in standard response
        // 将结果包装在标准响应中
        return {
          code: 0,
          message: 'success',
          data: result,
        };
      } catch (error) {
        this.logError(channel, 'handle', error);

        // Enhanced error handling with StandardError support
        // 增强的错误处理，支持 StandardError
        const isDevelopment = process.env.NODE_ENV === 'development';

        // Check if it's a StandardError
        if (error && typeof error === 'object' && 'code' in error && 'category' in error) {
          return {
            code: (error as any).code,
            message: (error as any).message,
            data: null,
            category: (error as any).category,
            details: (error as any).details,
            stack: isDevelopment ? (error as any).stack : undefined,
          };
        }

        // Return standard error response for regular errors
        // 为常规错误返回标准错误响应
        return {
          code: (error as any).code || 500,
          message: error instanceof Error ? error.message : String(error),
          data: null,
          stack: isDevelopment && error instanceof Error ? error.stack : undefined,
        };
      }
    };

    ipcMain.handle(channel, wrappedCb);
  }

  /**
   * 移除指定频道的监听器
   * @param channel - 频道名称
   * @param cb - 可选，指定要移除的回调函数。如果不传，则移除该频道下所有由 IpcTransport 管理的监听器
   */
  public removeListener(channel: string, cb?: IPCEventHandler): void {
    const channelListeners = this.channels.get(channel);
    if (!channelListeners) return;

    if (cb) {
      // 移除特定回调
      const wrappedCb = channelListeners.get(cb);
      if (wrappedCb) {
        ipcMain.removeListener(channel, wrappedCb);
        channelListeners.delete(cb);
      }
    } else {
      // 移除该频道下所有由本实例管理的监听器
      for (const wrappedCb of channelListeners.values()) {
        ipcMain.removeListener(channel, wrappedCb);
      }
      channelListeners.clear();
    }

    if (channelListeners.size === 0) {
      this.channels.delete(channel);
    }
  }

  /**
   * 移除所有监听器
   * @param channel - 可选，指定频道名称
   */
  public removeAllListeners(channel?: string): void {
    if (channel) {
      this.removeListener(channel);
    } else {
      for (const ch of this.channels.keys()) {
        this.removeListener(ch);
      }
      this.channels.clear();
    }
  }

  /**
   * 移除处理器
   * @param channel - 频道名称
   */
  public removeHandler(channel: string): void {
    if (this.handlers.has(channel)) {
      ipcMain.removeHandler(channel);
      this.handlers.delete(channel);
    }
  }

  /**
   * 移除所有处理器
   */
  public removeAllHandlers(): void {
    for (const channel of this.handlers) {
      ipcMain.removeHandler(channel);
    }
    this.handlers.clear();
  }

  /**
   * 记录错误信息
   * @param err - 错误信息
   */
  public error(err: string): void {
    this.logger.error(`[IPC System Error]: ${err}`);
  }

  /**
   * 记录普通日志
   * @param data - 日志信息
   */
  public log(data: string): void {
    this.logger.info(`[IPC System Log]: ${data}`);
  }

  // 私有辅助方法：格式化日志
  private logEvent(channel: string, type: 'on' | 'handle', args: unknown[]): void {
    try {
      // 尝试获取 data.name 作为操作名，这是我们约定的通信格式
      const actionName = (args[0] as { name?: string })?.name;
      const argStr = actionName ? `[Action: ${actionName}]` : `[Args: ${this.safeStringify(args)}]`;
      this.logger.info(`[${type.toUpperCase()}] ${channel} ${argStr}`);
    } catch {
      this.logger.info(`[${type.toUpperCase()}] ${channel} [Args parsing failed]`);
    }
  }

  private logError(channel: string, type: 'on' | 'handle', error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';
    this.logger.error(`[${type.toUpperCase()} ERROR] ${channel}: ${errorMsg}`, errorStack);
  }

  private serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
      // 获取所有属性，包括不可枚举的
      const serialized: Record<string, unknown> = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };

      // 复制其他自定义属性 (如 code, issues 等)
      for (const key of Object.getOwnPropertyNames(error)) {
        if (!['name', 'message', 'stack'].includes(key)) {
          serialized[key] = (error as any)[key];
        }
      }
      return serialized;
    }

    if (typeof error === 'object' && error !== null) {
      return error as Record<string, unknown>;
    }

    return {
      message: String(error),
      name: 'UnknownError',
    };
  }

  private safeStringify(obj: unknown): string {
    try {
      return JSON.stringify(obj);
    } catch {
      return '[Circular or Non-serializable]';
    }
  }
}
