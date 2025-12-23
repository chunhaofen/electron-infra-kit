/**
 * Branded Types for Type Safety
 * 品牌类型用于增强类型安全
 *
 * These are type-only definitions without runtime logic
 * 这些是纯类型定义，不包含运行时逻辑
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
