import IpcHandler from './IpcHandler';
import { IpcRequest, IpcSchema, IpcDefinition } from './ipc-router.type';
import { z } from 'zod';
import { MessageDispatcher } from '@/internal/utils/MessageDispatcher';
import { ILogger } from '@/infrastructure/logger';
import { IpcHandlerError } from '@/infrastructure/errors';
import { RateLimiter, RateLimitConfig } from '@/internal/utils/RateLimiter';
import { PerformanceMonitor } from '@/infrastructure/debug';

// Define the schema for IpcRequest
// 定义 IpcRequest 的 Schema
const IpcRequestSchema = z.object({
  name: z.string({ message: 'Handler name is required' }),
  payload: z.unknown().optional(),
});

export default class IpcRouter<
  Api extends Record<string, any> = Record<string, any>,
  Schema extends IpcSchema = Record<string, IpcDefinition>,
> {
  private _api: Api = {} as Api;
  private dispatcher: MessageDispatcher<Api>;
  private rateLimiter: RateLimiter;

  constructor(options: { logger?: ILogger; defaultRateLimit?: RateLimitConfig } = {}) {
    this.dispatcher = new MessageDispatcher('IpcRouter', options.logger);
    this.rateLimiter = new RateLimiter({
      logger: options.logger,
      defaultLimit: options.defaultRateLimit,
    });
  }

  /**
   * Add a single IPC handler
   * 添加单个IPC处理器
   * @param handler - IPC handler instance (IPC处理器实例)
   */
  addHandler<K extends keyof Schema>(
    handler: IpcHandler<Api, Schema[K]['payload'], Schema[K]['response']> & {
      name: K;
    }
  ): void {
    this.dispatcher.register(handler.name as string, handler.callback, handler.schema);
  }

  /**
   * Add multiple IPC handlers
   * 添加多个IPC处理器
   * @param handlers - Array of IPC handler instances (IPC处理器实例数组)
   */
  addHandlers(handlers: (IpcHandler<Api, any, any> & { name: keyof Schema })[]): void {
    handlers.forEach((handler) => this.addHandler(handler as any));
  }

  /**
   * Set rate limit for a specific handler
   * 为特定处理器设置限流
   * @param handlerName - Handler name (处理器名称)
   * @param config - Rate limit configuration (限流配置)
   */
  setRateLimit(handlerName: keyof Schema, config: RateLimitConfig): void {
    this.rateLimiter.setLimit(handlerName as string, config);
  }

  /**
   * Remove IPC handler by name
   * 移除指定名称的IPC处理器
   * @param name - Handler name (处理器名称)
   */
  removeHandler(name: string): void {
    this.dispatcher.unregister(name);
  }

  /**
   * Trigger callback of specified IPC handler
   * 触发指定名称的IPC处理器回调
   * @param data - Object containing handler name and data (包含处理器名称和数据的对象)
   * @param senderId - Optional sender ID (e.g. window ID) for rate limiting (可选的发送者 ID，用于限流)
   * @returns Return value of the callback function (回调函数的返回值)
   */
  handle<K extends keyof Schema>(
    data: IpcRequest<Schema[K]['payload']> & { name: K },
    senderId?: number | string
  ): Promise<Schema[K]['response']> {
    const perf = PerformanceMonitor.getInstance();
    const measureId = `ipc-${String(data.name)}-${Date.now()}`;

    const handleAsync = async (): Promise<Schema[K]['response']> => {
      try {
        perf.startMeasure(measureId, 'IPC Call', { handler: String(data.name), senderId });

        // 0. Rate Limiting Check
        // 0. 限流检查
        if (senderId !== undefined) {
          const rateLimitKey = `${senderId}:${String(data.name)}`;
          const allowed = this.rateLimiter.check(rateLimitKey, String(data.name));
          if (!allowed) {
            throw new IpcHandlerError(
              String(data.name),
              new Error(`Rate limit exceeded for handler "${String(data.name)}"`)
            );
          }
        }

        // Runtime validation using Zod (Envelope validation)
        // 使用 Zod 进行运行时校验 (信封校验)
        const validationResult = IpcRequestSchema.safeParse(data);

        if (!validationResult.success) {
          console.warn('[IpcRouter] Invalid IPC request data:', validationResult.error.format());
          throw new IpcHandlerError(
            'validation',
            new Error(`Invalid IPC request: ${validationResult.error.message}`)
          );
        }

        // Payload validation if schema exists
        // 如果存在 Schema，则进行 Payload 校验
        const schema = this.dispatcher.getMetadata(data.name as string) as
          | z.ZodType<any>
          | undefined;
        if (schema) {
          const payloadResult = schema.safeParse(data.payload);
          if (!payloadResult.success) {
            console.warn(
              `[IpcRouter] Invalid payload for handler "${String(data.name)}":`,
              payloadResult.error.message
            );
            throw new IpcHandlerError(
              String(data.name),
              new Error(`Invalid payload: ${payloadResult.error.message}`)
            );
          }
        }

        // 1. Dependency Injection (inject this._api)
        // 1. 依赖注入 (注入 this._api)
        const context = { ...this._api };

        // 2. Dispatch
        // 2. 分发
        const result = await Promise.resolve(
          this.dispatcher.dispatch(data.name as string, context, data.payload)
        );

        perf.endMeasure(measureId, { status: 'success' });
        return result as Schema[K]['response'];
      } catch (error: any) {
        perf.endMeasure(measureId, {
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
        });

        // Error handling
        // 错误处理
        if (error instanceof IpcHandlerError) {
          throw error;
        }
        throw new IpcHandlerError(String(data.name), error);
      }
    };

    return handleAsync();
  }

  /**
   * Inject API (Dependencies)
   * 注入 API (依赖)
   * @param name - API Name (API 名称)
   * @param api - API Instance (API 实例)
   */
  addApi(name: keyof Api, api: any): void {
    this._api[name] = api;
  }

  /**
   * Inject multiple APIs (Batch)
   * 批量注入 API
   * @param apis - Object containing API instances (包含 API 实例的对象)
   */
  addApis(apis: Partial<Api>): void {
    Object.entries(apis).forEach(([name, api]) => {
      this.addApi(name as keyof Api, api);
    });
  }

  /**
   * Dispose IpcRouter
   * 释放 IpcRouter
   */
  dispose(): void {
    this.rateLimiter.stopCleanup();
    this.rateLimiter.clear();
    this.dispatcher.clear();
    this._api = {} as Api;
  }
}
