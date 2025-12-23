import { Logger, ILogger } from '@/infrastructure/logger';

/**
 * Handler Callback Type
 * 处理器回调类型
 */
export type HandlerCallback<Context, T = any, R = any> = (
  context: Context,
  data: T
) => R | Promise<R>;

/**
 * Message Dispatcher - Generic event/message dispatching utility
 * 消息分发器 - 通用的事件/消息分发工具
 *
 * Unifies the message dispatching logic across different bridges (MessageBus, IpcRouter).
 * 统一不同桥接器（MessageBus, IpcRouter）的消息分发逻辑。
 *
 * @template Context - The context type passed to handlers (传递给处理器的上下文类型)
 */
export class MessageDispatcher<Context = any> {
  // Store handler along with optional metadata (like validation schema)
  private handlers = new Map<
    string,
    {
      callback: HandlerCallback<Context, any, any>;
      metadata?: any;
    }
  >();
  private logger: ILogger;
  private errorHandler?: (error: any, name: string) => any;

  constructor(name: string, logger?: ILogger, errorHandler?: (error: any, name: string) => any) {
    this.logger = logger || new Logger({ appName: name });
    this.errorHandler = errorHandler;
  }

  /**
   * Register a handler
   * 注册处理器
   * @param name - Handler name (处理器名称)
   * @param handler - Handler function (处理函数)
   * @param metadata - Optional metadata (e.g., validation schema)
   */
  register<T = any, R = any>(
    name: string,
    handler: HandlerCallback<Context, T, R>,
    metadata?: any
  ): void {
    if (this.handlers.has(name)) {
      this.logger.warn(`Handler "${name}" is being overwritten / 处理器 "${name}" 被覆盖`);
    }
    this.handlers.set(name, { callback: handler, metadata });
  }

  /**
   * Unregister a handler
   * 注销处理器
   * @param name - Handler name (处理器名称)
   * @returns True if removed (如果移除成功返回 true)
   */
  unregister(name: string): boolean {
    return this.handlers.delete(name);
  }

  /**
   * Get handler metadata
   * 获取处理器元数据
   */
  getMetadata(name: string): any | undefined {
    return this.handlers.get(name)?.metadata;
  }

  /**
   * Dispatch a message to a handler
   * 分发消息给处理器
   * @param name - Handler name (处理器名称)
   * @param context - Context to pass to handler (传递给处理器的上下文)
   * @param data - Data to pass to handler (传递给处理器的数据)
   * @returns Handler result (处理器结果)
   * @throws Error if handler execution fails (如果处理器执行失败抛出错误)
   */
  dispatch<T = any, R = any>(name: string, context: Context, data: T): R | undefined {
    const entry = this.handlers.get(name);
    if (!entry) {
      this.logger.warn(`No handler found for "${name}" / 未找到处理器 "${name}"`);
      return undefined;
    }

    try {
      return entry.callback(context, data);
    } catch (error) {
      this.logger.error(
        `Error in handler "${name}": ${error} / 处理器 "${name}" 执行错误: ${error}`
      );
      if (this.errorHandler) {
        return this.errorHandler(error, name);
      }
      throw error;
    }
  }

  /**
   * Check if handler exists
   * 检查处理器是否存在
   * @param name - Handler name (处理器名称)
   */
  has(name: string): boolean {
    return this.handlers.has(name);
  }

  /**
   * Get all registered handler names
   * 获取所有注册的处理器名称
   */
  getHandlerNames(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Clear all handlers
   * 清空所有处理器
   */
  clear(): void {
    this.handlers.clear();
  }
}
