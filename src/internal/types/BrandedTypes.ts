/**
 * Brand Types for Type Safety
 * 品牌类型用于增强类型安全
 */

/**
 * Window ID - Branded string type
 * 窗口 ID - 品牌字符串类型
 */
export type WindowId = string & { readonly __brand: 'WindowId' };

/**
 * Event Name - Branded string type
 * 事件名称 - 品牌字符串类型
 */
export type EventName = string & { readonly __brand: 'EventName' };

/**
 * Channel Name - Branded string type
 * 频道名称 - 品牌字符串类型
 */
export type ChannelName = string & { readonly __brand: 'ChannelName' };

/**
 * Handler Name - Branded string type
 * 处理器名称 - 品牌字符串类型
 */
export type HandlerName = string & { readonly __brand: 'HandlerName' };

/**
 * Field Key - Branded string type for MessageBus fields
 * 字段键 - MessageBus 字段的品牌字符串类型
 */
export type FieldKey = string & { readonly __brand: 'FieldKey' };

/**
 * Create a WindowId from a string with validation
 * 从字符串创建 WindowId (带验证)
 */
export function createWindowId(id: string): WindowId {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid window ID: must be a non-empty string');
  }
  return id as WindowId;
}

/**
 * Create an EventName from a string with validation
 * 从字符串创建 EventName (带验证)
 */
export function createEventName(name: string): EventName {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid event name: must be a non-empty string');
  }
  return name as EventName;
}

/**
 * Create a ChannelName from a string with validation
 * 从字符串创建 ChannelName (带验证)
 */
export function createChannelName(name: string): ChannelName {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid channel name: must be a non-empty string');
  }
  return name as ChannelName;
}

/**
 * Create a HandlerName from a string with validation
 * 从字符串创建 HandlerName (带验证)
 */
export function createHandlerName(name: string): HandlerName {
  if (!name || typeof name !== 'string') {
    throw new Error('Invalid handler name: must be a non-empty string');
  }
  return name as HandlerName;
}

/**
 * Create a FieldKey from a string with validation
 * 从字符串创建 FieldKey (带验证)
 */
export function createFieldKey(key: string): FieldKey {
  if (!key || typeof key !== 'string') {
    throw new Error('Invalid field key: must be a non-empty string');
  }
  return key as FieldKey;
}
