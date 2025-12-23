import { BrowserWindow, ipcMain, MessageChannelMain } from 'electron';
import { EventEmitter } from 'events';
import { Logger, ILogger } from '@/infrastructure/logger';
import { MessageDispatcher } from '@/internal/utils/MessageDispatcher';
import {
  DataChangeEvent,
  FieldPermission,
  MessageBusHandler,
  BusMessageHandler,
  MessageBusOptions,
  MessageProtocolType,
} from './message-bus.type';
import { EVENTS } from '@/core/window/constants';
import type WindowManager from '@/core/window/WindowManager';
import { TransactionManager } from './core/TransactionManager';
import { SubscriptionManager } from './core/SubscriptionManager';
import { DataStoreManager } from './core/DataStoreManager';
import { PerformanceMonitor } from '@/infrastructure/debug';
import { ITransport, MessagePortTransport, IpcTransport } from './transport';

/**
 * MessageBus - Multi-window state synchronization and communication bridge
 * MessageBus - 多窗口状态同步与通信桥梁
 *
 * Design patterns / 设计模式:
 * - Shared State (Instance-based): Singleton instance holds shared state (单例实例持有共享状态)
 * - Transport Layer Abstraction: Decouples communication mechanism (传输层抽象：解耦通信机制)
 * - Permission Control: Field-level + Window-level dual permission (权限控制：字段级 + 窗口级双重权限)
 * - Message Proxy: Unified communication interface (消息代理：统一的通信接口)
 * - Componentized: Delegates responsibilities to core managers (组件化：将职责委托给核心管理器)
 */
export class MessageBus extends EventEmitter {
  private eventName: string = EVENTS.WINDOW_STATE_CHANGED;
  protected logger: ILogger;

  // Core Managers
  // 核心管理器
  protected subscriptionManager: SubscriptionManager;
  protected transactionManager: TransactionManager;
  protected dataStoreManager: DataStoreManager;

  // Transport Layer
  // 传输层
  private transport: ITransport;
  private transportMode: 'messageport' | 'ipc';
  private windows: Map<string, BrowserWindow> = new Map();

  // Message dispatcher
  // 消息分发器
  protected dispatcher: MessageDispatcher<MessageBus>;

  // Group resolver for P2P messaging
  // P2P 消息的分组解析器
  private groupResolver?: (group: string) => string[];

  // Track watch callbacks for cleanup
  // 跟踪 watch 回调以便清理
  private watchCallbacks: Set<() => void> = new Set();

  // Window subscriptions for auto cleanup (Task 1)
  // 窗口订阅用于自动清理 (任务 1)
  private windowSubscriptions = new WeakMap<BrowserWindow, Set<() => void>>();

  /**
   * Create a new MessageBus instance
   * 创建一个新的 MessageBus 实例
   *
   * @param options - Configuration options
   */
  public constructor(options: MessageBusOptions = {}) {
    super();

    this.eventName = options.eventName || EVENTS.WINDOW_STATE_CHANGED;
    this.logger = options.logger || new Logger({ appName: 'MessageBus' });

    this.dispatcher = new MessageDispatcher<MessageBus>('MessageBus', this.logger);
    this.subscriptionManager = new SubscriptionManager(this.logger);
    this.transactionManager = new TransactionManager(this.logger);
    this.dataStoreManager = new DataStoreManager();

    // Initialize Transport Strategy (Task 5)
    // 初始化传输策略 (任务 5)
    const mode = options.transportMode || 'auto';
    this.transportMode = this.selectTransportMode(mode);
    this.transport = this.createTransport(this.transportMode);

    try {
      this.transport.init((msg, windowId) => this.handleTransportMessage(msg, windowId));
      this.logger.info(`MessageBus initialized with ${this.transportMode} transport`);
    } catch (error) {
      // Fallback if initialization fails
      this.logger.error(
        `Failed to initialize ${this.transportMode} transport: ${error}. Falling back to IPC.`
      );
      this.transportMode = 'ipc';
      this.transport = new IpcTransport(this.logger);
      this.transport.init((msg, windowId) => this.handleTransportMessage(msg, windowId));
    }

    this.registerDefaultHandlers();
  }

  /**
   * Select transport mode
   * 选择传输模式
   */
  private selectTransportMode(mode: string): 'messageport' | 'ipc' {
    if (mode === 'ipc') return 'ipc';
    if (mode === 'messageport') return 'messageport';

    // Auto: Check environment capabilities
    // 自动：检查环境能力
    if (typeof MessageChannelMain === 'undefined') {
      this.logger.warn('MessageChannelMain not available, falling back to IPC transport');
      return 'ipc';
    }

    return 'messageport';
  }

  /**
   * Create transport instance
   * 创建传输实例
   */
  private createTransport(mode: string): ITransport {
    if (mode === 'ipc') return new IpcTransport(this.logger);
    return new MessagePortTransport(this.logger);
  }

  /**
   * Handle incoming message from transport
   * 处理来自传输层的消息
   */
  private handleTransportMessage(msg: any, windowId: string): void {
    try {
      if (msg && msg.type) {
        const result = this.dispatcher.dispatch(msg.type, this, { ...msg, windowId });

        // Handle response if requestId exists (for 'get' requests)
        if (msg.requestId) {
          Promise.resolve(result)
            .then((value) => {
              this.transport.send(windowId, {
                type: MessageProtocolType.GET_RESPONSE,
                requestId: msg.requestId,
                value,
              });
            })
            .catch((err) => {
              this.logger.error(`Error handling message ${msg.type}: ${err}`);
            });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle message from window ${windowId}: ${error}`);
    }
  }

  /**
   * Register a window with MessageBus
   * 注册窗口到 MessageBus
   * @param windowId - Window ID (窗口 ID)
   * @param window - BrowserWindow instance (BrowserWindow 实例)
   */
  registerWindow(windowId: string, window: BrowserWindow): void {
    // Clean up existing registration if any
    // 清理现有的注册（如果有）
    this.unregisterWindow(windowId);

    this.windows.set(windowId, window);
    this.transport.registerWindow(windowId, window);
  }

  /**
   * Unregister a window from MessageBus
   * 从 MessageBus 注销窗口
   * @param windowId - Window ID (窗口 ID)
   */
  unregisterWindow(windowId: string): void {
    // 1. Clean up window-specific subscriptions (Task 1)
    const window = this.windows.get(windowId);
    if (window && this.windowSubscriptions.has(window)) {
      const unsubs = this.windowSubscriptions.get(window);
      if (unsubs) {
        this.logger.info(`Cleaning up ${unsubs.size} subscriptions for window ${windowId}`);
        unsubs.forEach((unsub) => {
          try {
            unsub();
          } catch (e) {
            /* ignore */
          }
        });
        this.windowSubscriptions.delete(window);
      }
    }

    this.transport.unregisterWindow(windowId);
    this.windows.delete(windowId);

    // Remove subscriptions for this window
    // 移除该窗口的订阅
    this.subscriptionManager.removeWindow(windowId);

    // Rollback any active transactions
    // 回滚任何活跃事务
    if (this.transactionManager.hasTransaction(windowId)) {
      this.transactionManager.rollback(windowId);
    }
  }

  /**
   * Auto register/unregister windows with WindowManager
   * 自动注册/注销窗口与 WindowManager
   * @param windowManager - WindowManager instance (WindowManager 实例)
   */
  autoRegisterWindows(windowManager: WindowManager): void {
    // Register on window creation
    // 在窗口创建时注册
    windowManager.on('window-created', ({ window, id }: { window: BrowserWindow; id: string }) => {
      this.registerWindow(id, window);
    });

    // Unregister on window destruction
    // 在窗口销毁时注销
    windowManager.on('window-will-be-destroyed', (id: string) => {
      this.unregisterWindow(id);
    });
  }

  /**
   * Dispose all resources
   * 释放所有资源
   */
  public dispose(): void {
    this.logger.info('Disposing MessageBus...');

    // 1. Clean up all watch callbacks
    // 清理所有 watch 回调
    this.watchCallbacks.forEach((unsubscribe) => {
      try {
        unsubscribe();
      } catch (error) {
        this.logger.warn(`Failed to unsubscribe watch callback: ${error}`);
      }
    });
    this.watchCallbacks.clear();

    // 2. Clean up MessageHandlers
    this.dispatcher.clear();

    // 3. Dispose transport
    this.transport.dispose();

    // 4. Clear data and subscriptions
    this.dataStoreManager.clear();
    this.subscriptionManager.clear();
    this.transactionManager.clear();
    this.windows.clear();

    // 5. Remove all event listeners
    this.removeAllListeners();

    this.logger.info('MessageBus disposed');
  }

  /**
   * Register a single event handler
   * 注册单个事件处理器
   * @param handler - Event handler (事件处理器)
   */
  registerHandler(handler: MessageBusHandler): void {
    this.on(handler.eventName, handler.callback);
  }

  /**
   * Batch register event handlers
   * 批量注册事件处理器
   * @param handlers - Array of event handlers (事件处理器数组)
   */
  registerHandlers(handlers: MessageBusHandler[]): void {
    handlers.forEach((handler) => this.registerHandler(handler));
  }

  /**
   * Unregister a single event handler
   * 注销单个事件处理器
   * @param handler - Event handler (事件处理器)
   */
  unregisterHandler(handler: MessageBusHandler): void {
    this.removeListener(handler.eventName, handler.callback);
  }

  /**
   * Batch unregister event handlers
   * 批量注销事件处理器
   * @param handlers - Array of event handlers (事件处理器数组)
   */
  unregisterHandlers(handlers: MessageBusHandler[]): void {
    handlers.forEach((handler) => this.unregisterHandler(handler));
  }

  /**
   * Get data
   * 获取数据
   * @param key - Data key, returns all data if not provided (数据键，不传则返回所有数据)
   * @returns Data value or all data (数据值或所有数据)
   */
  getData(key?: string): any {
    if (key) {
      return this.dataStoreManager.get(key);
    }
    return this.dataStoreManager.getAll();
  }

  /**
   * Check permission
   * 检查权限
   * @param key - Data key (数据键)
   * @param windowId - Operation window ID (操作窗口 ID)
   * @param operation - Operation type (操作类型)
   * @returns Result object with success flag and error message (包含成功标志和错误消息的结果对象)
   */
  private checkPermission(
    key: string,
    windowId: string | undefined,
    operation: 'modify' | 'delete'
  ): { success: boolean; error?: string } {
    return this.dataStoreManager.checkPermission(key, windowId, operation);
  }

  /**
   * Set data (with permission check and transaction support)
   * 设置数据（带权限验证和事务支持）
   * @param key - Data key (数据键)
   * @param value - Data value (数据值)
   * @param windowId - Operation window ID (操作窗口 ID)
   * @param eventName - Optional event name (可选的事件名称)
   * @param skipTransaction - Whether to skip transaction check (是否跳过事务检查)
   * @returns Result object with success flag and error message (包含成功标志和错误消息的结果对象)
   */
  setData(
    key: string,
    value: any,
    windowId?: string,
    eventName?: string,
    skipTransaction: boolean = false
  ): { success: boolean; error?: string } {
    const permissionCheck = this.checkPermission(key, windowId, 'modify');
    if (!permissionCheck.success) {
      return permissionCheck;
    }

    // Handle Transaction
    if (!skipTransaction && windowId && this.transactionManager.hasTransaction(windowId)) {
      this.transactionManager.add(windowId, key, { type: 'set', value });
      return { success: true };
    }

    const item = this.dataStoreManager.getItem(key);
    const oldValue = item?.value;

    this.dataStoreManager.set(key, value);

    // Broadcast change
    // 广播变更
    const event: DataChangeEvent = {
      type: MessageProtocolType.SET,
      key,
      value,
      oldValue,
      windowId,
      timestamp: Date.now(),
    };
    this.broadcastChange(event);
    this.emit(eventName || this.eventName, event);

    return { success: true };
  }

  /**
   * Delete data
   * 删除数据
   * @param key - Data key (数据键)
   * @param windowId - Operation window ID (操作窗口 ID)
   * @param eventName - Optional event name (可选的事件名称)
   * @param skipTransaction - Whether to skip transaction check (是否跳过事务检查)
   * @returns Result object with success flag and error message (包含成功标志和错误消息的结果对象)
   */
  deleteData(
    key: string,
    windowId?: string,
    eventName?: string,
    skipTransaction: boolean = false
  ): { success: boolean; error?: string } {
    const permissionCheck = this.checkPermission(key, windowId, 'delete');
    if (!permissionCheck.success) {
      return permissionCheck;
    }

    // Handle Transaction
    if (!skipTransaction && windowId && this.transactionManager.hasTransaction(windowId)) {
      this.transactionManager.add(windowId, key, { type: 'delete' });
      return { success: true };
    }

    const item = this.dataStoreManager.getItem(key);
    const oldValue = item?.value;

    this.dataStoreManager.delete(key);

    const event: DataChangeEvent = {
      type: MessageProtocolType.DELETE,
      key,
      oldValue,
      windowId,
      timestamp: Date.now(),
    };
    this.broadcastChange(event);
    this.emit(eventName || this.eventName, event);

    return { success: true };
  }

  /**
   * Start a transaction
   * 开启事务
   * @param windowId - Window ID (窗口 ID)
   */
  startTransaction(windowId: string): void {
    this.transactionManager.start(windowId);
  }

  /**
   * Commit a transaction
   * 提交事务
   * @param windowId - Window ID (窗口 ID)
   */
  commitTransaction(windowId: string): void {
    const buffer = this.transactionManager.commit(windowId);
    if (!buffer) return;

    buffer.forEach((op, key) => {
      if (op.type === 'set') {
        this.setData(key, op.value, windowId, undefined, true);
      } else if (op.type === 'delete') {
        this.deleteData(key, windowId, undefined, true);
      }
    });
  }

  /**
   * Rollback a transaction
   * 回滚事务
   * @param windowId - Window ID (窗口 ID)
   */
  rollbackTransaction(windowId: string): void {
    this.transactionManager.rollback(windowId);
  }

  /**
   * Watch for data changes (Main Process)
   * 监听数据变化（主进程）
   *
   * ⚠️ IMPORTANT: You must call the returned unsubscribe function to prevent memory leaks
   * ⚠️ 重要：必须调用返回的取消订阅函数以防止内存泄漏
   *
   * @param key - Data key to watch (监听的键)
   * @param callback - Callback function (回调函数)
   * @param windowId - Optional window ID to bind lifecycle (可选的窗口 ID，用于绑定生命周期)
   * @returns Unsubscribe function (取消订阅函数)
   */
  watch(
    key: string,
    callback: (newValue: any, oldValue: any) => void,
    windowId?: string
  ): () => void {
    const handler = (event: DataChangeEvent) => {
      if ('key' in event && event.key === key) {
        if (event.type === MessageProtocolType.SET) {
          callback(event.value, event.oldValue);
        } else if (event.type === MessageProtocolType.DELETE) {
          callback(undefined, event.oldValue);
        }
      }
    };
    this.on(this.eventName, handler);

    const unsubscribe = () => {
      this.off(this.eventName, handler);
      this.watchCallbacks.delete(unsubscribe);

      // Cleanup from weak map if exists
      if (windowId) {
        const window = this.windows.get(windowId);
        if (window && this.windowSubscriptions.has(window)) {
          this.windowSubscriptions.get(window)?.delete(unsubscribe);
        }
      }
    };

    // Track for automatic cleanup on dispose
    // 跟踪以便在 dispose 时自动清理
    this.watchCallbacks.add(unsubscribe);

    // Track for window lifecycle cleanup (Task 1)
    if (windowId) {
      const window = this.windows.get(windowId);
      if (window) {
        if (!this.windowSubscriptions.has(window)) {
          this.windowSubscriptions.set(window, new Set());
        }
        this.windowSubscriptions.get(window)!.add(unsubscribe);
      } else {
        this.logger.warn(
          `Window ${windowId} not found, watch subscription will not be auto-cleaned up on window destroy`
        );
      }
    }

    return unsubscribe;
  }

  /**
   * Atomic update
   * 原子更新
   * @param key - Data key (数据键)
   * @param updater - Updater function or new value (更新函数或新值)
   * @param windowId - Window ID (窗口 ID)
   */
  updateData(
    key: string,
    updater: (oldVal: any) => any,
    windowId?: string
  ): { success: boolean; error?: string } {
    let currentValue = this.dataStoreManager.get(key);

    if (windowId) {
      const buffered = this.transactionManager.getBufferedValue(windowId, key);
      if (buffered.has) {
        currentValue = buffered.value;
      }
    }

    const newValue = typeof updater === 'function' ? updater(currentValue) : updater;
    return this.setData(key, newValue, windowId);
  }

  /**
   * Set field permission
   * 设置字段权限
   * @param key - Data key (数据键)
   * @param permission - Permission object (权限对象)
   */
  setFieldPermission(key: string, permission: FieldPermission): void {
    this.dataStoreManager.setPermission(key, permission);
  }

  /**
   * Get registered windows list (for debugging)
   * 获取已注册的窗口列表（调试用）
   * @returns Array of registered window IDs (已注册的窗口 ID 数组)
   */
  getRegisteredWindows(): string[] {
    return Array.from(this.windows.keys());
  }

  /**
   * Register message handler
   * 注册消息处理器
   * @param handler - Bus message handler (总线消息处理器)
   */
  registerMessageHandler(handler: BusMessageHandler): void {
    this.dispatcher.register(handler.name, handler.callback);
  }

  /**
   * Register default handlers
   * 注册默认处理器
   */
  private registerDefaultHandlers(): void {
    this.registerMessageHandler({
      name: MessageProtocolType.GET,
      callback: (bus, { key } = {}) => bus.getData(key),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.SET,
      callback: (bus, { key, value, windowId, eventName }) =>
        bus.setData(key, value, windowId, eventName),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.DELETE,
      callback: (bus, { key, windowId, eventName }) => bus.deleteData(key, windowId, eventName),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.SET_PERMISSION,
      callback: (bus, { key, permission }) => bus.setFieldPermission(key, permission),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.SUBSCRIBE,
      callback: (bus, { windowId, keys }) => bus.subscribe(windowId, keys),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.UNSUBSCRIBE,
      callback: (bus, { windowId, keys }) => bus.unsubscribe(windowId, keys),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.TRANSACTION_START,
      callback: (bus, { windowId }) => bus.startTransaction(windowId),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.TRANSACTION_COMMIT,
      callback: (bus, { windowId }) => bus.commitTransaction(windowId),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.TRANSACTION_ROLLBACK,
      callback: (bus, { windowId }) => bus.rollbackTransaction(windowId),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.SEND_TO_WINDOW,
      callback: (bus, { targetWindowId, channel, data }) =>
        bus.sendToWindow(targetWindowId, channel, data),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.SEND_TO_GROUP,
      callback: (bus, { group, channel, data }) => bus.sendToGroup(group, channel, data),
    });

    this.registerMessageHandler({
      name: MessageProtocolType.UPDATE,
      callback: (bus, { key, value, windowId }) => {
        return bus.setData(key, value, windowId);
      },
    });
  }

  /**
   * Handle message
   * 处理消息
   * @param name - Message name (消息名称)
   * @param data - Message data (消息数据)
   * @returns Result of handler (处理器结果)
   */
  handleMessage(name: string, data: any): any {
    return this.dispatcher.dispatch(name, this, data);
  }

  /**
   * Initialize communication listener (optional)
   * 初始化通信监听器（可选）
   *
   * Allows renderer process to read/write data directly via unified channel.
   * 允许渲染进程通过统一通道直接读写数据。
   */
  initializeListener(): void {
    // Unified channel, optimize communication
    // 统一通道，优化通信方式
    ipcMain.handle('message-bus-invoke', (_, { name, data }) => this.handleMessage(name, data));
  }

  /**
   * Set group resolver
   * 设置分组解析器
   * @param resolver - Group resolver function (分组解析函数)
   */
  setGroupResolver(resolver: (group: string) => string[]): void {
    this.groupResolver = resolver;
  }

  /**
   * Send message to specific window
   * 发送消息到指定窗口
   * @param windowId - Target window ID (目标窗口 ID)
   * @param channel - Channel name (频道名称)
   * @param data - Message data (消息数据)
   * @returns Success or not (是否成功)
   */
  sendToWindow(windowId: string, channel: string, data: any): boolean {
    const perf = PerformanceMonitor.getInstance();
    const measureId = `message-bus-send-${Date.now()}`;

    perf.startMeasure(measureId, 'MessageBus Send', { windowId, channel });

    if (!this.windows.has(windowId)) {
      this.logger.warn(`Window ${windowId} not found or not registered`);
      perf.endMeasure(measureId, { status: 'failed', reason: 'window_not_found' });
      return false;
    }

    try {
      const message: DataChangeEvent = {
        type: MessageProtocolType.MESSAGE,
        channel,
        value: data,
        timestamp: Date.now(),
      };

      this.transport.send(windowId, JSON.stringify(message));

      perf.endMeasure(measureId, { status: 'success' });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message to window ${windowId}: ${error}`);
      this.emit('error', error);
      perf.endMeasure(measureId, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Send message to a group of windows
   * 发送消息到一组窗口
   * @param group - Group name (组名)
   * @param channel - Channel name (频道名称)
   * @param data - Message data (消息数据)
   * @returns Number of successful sends (成功发送的数量)
   */
  sendToGroup(group: string, channel: string, data: any): number {
    const perf = PerformanceMonitor.getInstance();
    const measureId = `message-bus-broadcast-${Date.now()}`;

    perf.startMeasure(measureId, 'MessageBus Broadcast', { group, channel });

    if (!this.groupResolver) {
      this.logger.warn('Group resolver not set, cannot send to group');
      perf.endMeasure(measureId, { status: 'failed', reason: 'no_group_resolver' });
      return 0;
    }
    const windowIds = this.groupResolver(group);
    const count = this.broadcastToWindows(windowIds, channel, data);

    perf.endMeasure(measureId, {
      status: 'success',
      windowCount: windowIds.length,
      successCount: count,
    });
    return count;
  }

  /**
   * Broadcast message to specific windows
   * 广播消息到指定的一组窗口
   * @param windowIds - Target window IDs (目标窗口 ID 列表)
   * @param channel - Channel name (频道名称)
   * @param data - Message data (消息数据)
   * @returns Number of successful sends (成功发送的数量)
   */
  broadcastToWindows(windowIds: string[], channel: string, data: any): number {
    const message: DataChangeEvent = {
      type: MessageProtocolType.MESSAGE,
      channel,
      value: data,
      timestamp: Date.now(),
    };
    const serializedMessage = JSON.stringify(message);

    return this.transport.broadcast(serializedMessage, windowIds);
  }

  /**
   * Subscribe to specific keys
   * 订阅特定的 key
   * @param windowId - Window ID (窗口 ID)
   * @param keys - Keys to subscribe (订阅的 key 列表)
   */
  public subscribe(windowId: string, keys: string[]): void {
    this.subscriptionManager.subscribe(windowId, keys);
  }

  /**
   * Unsubscribe from specific keys
   * 取消订阅特定的 key
   * @param windowId - Window ID (窗口 ID)
   * @param keys - Keys to unsubscribe (取消订阅的 key 列表)
   */
  public unsubscribe(windowId: string, keys: string[]): void {
    this.subscriptionManager.unsubscribe(windowId, keys);
  }

  /**
   * Broadcast changes to all windows via Transport
   * 通过传输层广播变更到所有窗口
   * @param event - Data change event (数据变更事件)
   */
  private broadcastChange(event: DataChangeEvent): void {
    const message = JSON.stringify(event);

    // If it's a key-based event and has subscribers, only broadcast to them
    // 如果是基于 key 的事件且有订阅者，只广播给订阅者
    if ('key' in event && event.key) {
      const subscribers = this.subscriptionManager.getSubscribers(event.key);
      if (subscribers) {
        this.transport.broadcast(message, Array.from(subscribers));
        return;
      }
    }

    // Broadcast to all windows (fallback or non-keyed events)
    this.transport.broadcast(message);
  }
}
