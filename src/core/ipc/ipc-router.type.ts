/**
 * IPC Request Interface
 * IPC 请求接口
 *
 * @template T - Payload type (载荷类型)
 */
export interface IpcRequest<T = any> {
  /**
   * Handler name
   * 处理器名称
   */
  name: string;
  /**
   * Request payload
   * 请求载荷
   */
  payload?: T;
}

/**
 * IPC Handler Callback Interface
 * IPC 处理器回调接口
 *
 * @template Context - Context/API type (上下文/API 类型)
 * @template T - Input data type (输入数据类型)
 * @template R - Return value type (返回值类型)
 */
export interface IpcHandlerCallback<Context = Record<string, any>, T = any, R = any> {
  /**
   * Callback function
   * 回调函数
   * @param api - API object exposed to the handler (暴露给处理器的 API 对象)
   * @param data - Input data (输入数据)
   * @returns Result of the operation (操作结果)
   */
  (api: Context, data: T): R;
}

/**
 * IPC Handler Data Interface
 * IPC 处理器数据接口
 *
 * @template T - Data payload type (数据载荷类型)
 */
export interface IpcHandlerData<T = any> {
  /**
   * Handler name
   * 处理器名称
   */
  name: string;
  /**
   * Data payload
   * 数据载荷
   */
  data?: T;
}

/**
 * IPC Definition Interface
 * IPC 定义接口
 *
 * @template Payload - Request payload type (请求载荷类型)
 * @template Response - Response data type (响应数据类型)
 */
export interface IpcDefinition<Payload = any, Response = any> {
  payload: Payload;
  response: Response;
}

/**
 * IPC Schema Type
 * IPC 架构类型
 *
 * Mapping of handler names to their definitions
 * 处理器名称到定义的映射
 */
export type IpcSchema = Record<string, IpcDefinition>;
