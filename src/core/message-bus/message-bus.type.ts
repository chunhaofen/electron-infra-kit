import type { MessageBus } from './MessageBus';
import { ILogger } from '@/infrastructure/logger';

/**
 * Message Bus Protocol Types
 * Message Bus 协议类型
 */
export enum MessageProtocolType {
  GET = 'get',
  GET_RESPONSE = 'get-response',
  SET = 'set',
  DELETE = 'delete',
  CLEAR = 'clear',
  MESSAGE = 'message',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  SET_PERMISSION = 'set-permission',
  CONNECT = '__message_bus_ready__',
  // Transaction operations
  TRANSACTION_START = 'transaction-start',
  TRANSACTION_COMMIT = 'transaction-commit',
  TRANSACTION_ROLLBACK = 'transaction-rollback',
  // Atomic update
  UPDATE = 'update',
  // P2P Messaging
  SEND_TO_WINDOW = 'send-to-window',
  SEND_TO_GROUP = 'send-to-group',
}

/**
 * Message Bus Configuration Options
 * Message Bus 配置选项
 */
export interface MessageBusOptions {
  /**
   * Custom event name for state changes
   * 自定义状态变更事件名称
   * @default 'window-state-changed'
   */
  eventName?: string;

  /**
   * Logger instance
   * 日志实例
   */
  logger?: ILogger;

  /**
   * Transport mode (auto, messageport, ipc)
   * 传输模式
   */
  transportMode?: 'auto' | 'messageport' | 'ipc';
}

/**
 * MessageBus Subscription Options
 * MessageBus 订阅选项
 */
export interface MessageBusSubscriptionOptions {
  /**
   * Filter function to determine if the update should be processed
   * 过滤函数，用于确定是否应处理更新
   */
  filter?: (key: string, value: unknown) => boolean;

  /**
   * Specific keys to subscribe to (if not provided, subscribes to all)
   * 要订阅的特定键（如果未提供，则订阅所有）
   */
  keys?: string[];

  /**
   * Debounce time in milliseconds (0 = no debounce)
   * 防抖时间（毫秒）（0 = 不防抖）
   * @default 0
   */
  debounce?: number;
}

// Discriminated Unions for Events
// 事件的辨识联合类型

export interface BaseEvent {
  timestamp?: number;
  windowId?: string;
}

export interface SetEvent<T = any> extends BaseEvent {
  type: MessageProtocolType.SET;
  key: string;
  value: T;
  oldValue?: T;
}

export interface DeleteEvent extends BaseEvent {
  type: MessageProtocolType.DELETE;
  key: string;
  oldValue?: any;
}

export interface ClearEvent extends BaseEvent {
  type: MessageProtocolType.CLEAR;
}

export interface MessageEvent<T = any> extends BaseEvent {
  type: MessageProtocolType.MESSAGE;
  channel: string;
  value: T;
}

export type DataChangeEvent<T = any> = SetEvent<T> | DeleteEvent | ClearEvent | MessageEvent<T>;

/**
 * Field Permission Mode
 * 字段权限模式
 */
export type FieldPermissionMode = 'read' | 'write' | 'read-write' | 'none';

/**
 * Field Permission Configuration
 * 字段权限配置
 */
export interface FieldPermissionConfig {
  mode: FieldPermissionMode;
  /**
   * Whether the field is read-only
   * 是否只读
   */
  readonly?: boolean;
  /**
   * List of window IDs allowed to write to this field
   * 允许写入此字段的窗口 ID 列表
   */
  allowedWindows?: string[];
}

/**
 * Field Permission Type
 * 字段权限类型
 */
export type FieldPermission = FieldPermissionMode | FieldPermissionConfig;

/**
 * Data Store Item
 * 数据存储项
 */
export interface DataStoreItem<T = any> {
  value: T;
  permission?: FieldPermission;
}

/**
 * Message Handler Interface
 * 消息处理函数接口
 */
export interface MessageBusHandler {
  eventName: string;
  callback: (event: DataChangeEvent) => void;
}

/**
 * Bus Message Handler Interface
 * 总线消息处理函数接口
 */
export interface BusMessageHandler {
  name: string;
  callback: (bus: MessageBus, data: any) => any;
}
