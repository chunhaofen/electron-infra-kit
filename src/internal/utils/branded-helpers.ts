/**
 * Branded Type Helpers
 * 品牌类型辅助函数
 *
 * Utility functions for creating and validating branded types
 * 用于创建和验证品牌类型的工具函数
 */

import type {
  WindowId,
  EventName,
  ChannelName,
  HandlerName,
  FieldKey,
} from '@/internal/types/branded';

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
