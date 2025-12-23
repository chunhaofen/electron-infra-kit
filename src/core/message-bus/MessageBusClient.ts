import { ILogger, Logger } from '@/infrastructure/logger';
import { v4 as uuidv4 } from 'uuid';
import { MessageProtocolType } from './message-bus.type';

/**
 * MessageBusClient - Simplified client for renderer process
 * MessageBusClient - 渲染进程的简化客户端
 *
 * Provides a high-level API for interacting with MessageBus from renderer
 * 为渲染进程提供与 MessageBus 交互的高级 API
 */
export class MessageBusClient {
  private port: MessagePort | null = null;
  private ready = false;
  private pendingOperations: (() => void)[] = [];
  private subscriptions = new Map<string, Set<(value: any) => void>>();
  private messageListeners = new Map<string, Set<(data: any) => void>>();
  private pendingRequests = new Map<string, { resolve: (value: any) => void; timeout: any }>();
  private logger: ILogger;

  constructor(options: { logger?: ILogger } = {}) {
    this.logger = options.logger || new Logger({ appName: 'MessageBusClient' });
    this.initialize();
  }

  /**
   * Subscribe to a key's changes
   * 订阅某个 key 的变化
   * @param key - Data key (数据键)
   * @param callback - Callback function (回调函数)
   * @returns Unsubscribe function (取消订阅函数)
   */
  subscribe<T = any>(key: string, callback: (value: T) => void): () => void {
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
      // Notify main process to subscribe to this key
      this.ensureReady(() => {
        this.port!.postMessage(
          JSON.stringify({
            type: MessageProtocolType.SUBSCRIBE,
            keys: [key],
          })
        );
      });
    }

    this.subscriptions.get(key)!.add(callback);

    // Return unsubscribe function
    // 返回取消订阅函数
    return () => {
      this.subscriptions.get(key)?.delete(callback);
      if (this.subscriptions.get(key)?.size === 0) {
        this.subscriptions.delete(key);
        // Notify main process to unsubscribe from this key
        this.ensureReady(() => {
          this.port!.postMessage(
            JSON.stringify({
              type: MessageProtocolType.UNSUBSCRIBE,
              keys: [key],
            })
          );
        });
      }
    };
  }

  /**
   * Watch for data changes (Alias for subscribe)
   * 监听数据变化（subscribe 的别名）
   * @param key - Data key (数据键)
   * @param callback - Callback function (回调函数)
   * @returns Unsubscribe function (取消订阅函数)
   */
  watch<T = any>(key: string, callback: (value: T) => void): () => void {
    return this.subscribe<T>(key, callback);
  }

  /**
   * Listen for P2P messages on a channel
   * 监听频道上的 P2P 消息
   * @param channel - Channel name (频道名称)
   * @param callback - Callback function (回调函数)
   * @returns Unsubscribe function (取消订阅函数)
   */
  onMessage<T = any>(channel: string, callback: (data: T) => void): () => void {
    if (!this.messageListeners.has(channel)) {
      this.messageListeners.set(channel, new Set());
    }

    this.messageListeners.get(channel)!.add(callback);

    return () => {
      this.messageListeners.get(channel)?.delete(callback);
      if (this.messageListeners.get(channel)?.size === 0) {
        this.messageListeners.delete(channel);
      }
    };
  }

  /**
   * Send message to a specific window
   * 发送消息到指定窗口
   * @param targetWindowId - Target window ID (目标窗口 ID)
   * @param channel - Channel name (频道名称)
   * @param data - Message data (消息数据)
   */
  sendToWindow(targetWindowId: string, channel: string, data: any): void {
    this.ensureReady(() => {
      this.port!.postMessage(
        JSON.stringify({
          type: MessageProtocolType.SEND_TO_WINDOW,
          targetWindowId,
          channel,
          data,
        })
      );
    });
  }

  /**
   * Send message to a group of windows
   * 发送消息到一组窗口
   * @param group - Group name (组名)
   * @param channel - Channel name (频道名称)
   * @param data - Message data (消息数据)
   */
  sendToGroup(group: string, channel: string, data: any): void {
    this.ensureReady(() => {
      this.port!.postMessage(
        JSON.stringify({
          type: MessageProtocolType.SEND_TO_GROUP,
          group,
          channel,
          data,
        })
      );
    });
  }

  /**
   * Set a value
   * 设置值
   * @param key - Data key (数据键)
   * @param value - Data value (数据值)
   */
  set(key: string, value: any): void {
    this.ensureReady(() => {
      this.port!.postMessage(
        JSON.stringify({
          type: MessageProtocolType.SET,
          key,
          value,
        })
      );
    });
  }

  /**
   * Get a value (async)
   * 获取值（异步）
   * @param key - Data key (数据键)
   * @returns Promise with the value (包含值的 Promise)
   */
  async get<T = any>(key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      this.ensureReady(() => {
        const requestId = uuidv4();

        // Register request
        const timeout = setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            this.logger.warn(`Get request for key "${key}" timed out`);
            resolve(undefined);
          }
        }, 5000);

        this.pendingRequests.set(requestId, { resolve, timeout });

        // Send get request
        // 发送获取请求
        this.port!.postMessage(
          JSON.stringify({
            type: MessageProtocolType.GET,
            key,
            requestId,
          })
        );
      });
    });
  }

  /**
   * Delete a value
   * 删除值
   * @param key - Data key (数据键)
   */
  delete(key: string): void {
    this.ensureReady(() => {
      this.port!.postMessage(
        JSON.stringify({
          type: MessageProtocolType.DELETE,
          key,
        })
      );
    });
  }

  /**
   * Initialize the message port connection
   * 初始化消息端口连接
   */
  private initialize(): void {
    window.addEventListener('message', (event) => {
      if (event.data?.type === MessageProtocolType.CONNECT) {
        this.port = event.ports[0];
        this.port.onmessage = this.handleMessage.bind(this);
        this.port.start();
        this.ready = true;

        this.logger.debug('MessageBusClient connected');

        // Execute pending operations
        // 执行待处理的操作
        this.pendingOperations.forEach((op) => op());
        this.pendingOperations = [];
      }
    });
  }

  /**
   * Handle incoming messages
   * 处理传入的消息
   */
  private handleMessage(e: MessageEvent): void {
    try {
      const msg = JSON.parse(e.data);

      // Handle get responses
      // 处理获取响应
      if (msg.type === MessageProtocolType.GET_RESPONSE && msg.requestId) {
        const request = this.pendingRequests.get(msg.requestId);
        if (request) {
          clearTimeout(request.timeout);
          this.pendingRequests.delete(msg.requestId);
          request.resolve(msg.value);
        }
        return;
      }

      // Handle P2P messages
      // 处理 P2P 消息
      if (msg.type === 'message' && msg.channel) {
        const listeners = this.messageListeners.get(msg.channel);
        if (listeners) {
          listeners.forEach((cb) => {
            try {
              cb(msg.value);
            } catch (error) {
              this.logger.error(`Error in message listener for channel "${msg.channel}": ${error}`);
            }
          });
        }
        return;
      }

      // Notify all subscribers for this key
      // 通知该键的所有订阅者
      if (
        msg.key &&
        (msg.type === MessageProtocolType.SET || msg.type === MessageProtocolType.DELETE)
      ) {
        const callbacks = this.subscriptions.get(msg.key);
        if (callbacks) {
          callbacks.forEach((cb) => {
            try {
              cb(msg.value);
            } catch (error) {
              this.logger.error(`Error in subscription callback for key "${msg.key}": ${error}`);
            }
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to handle message: ${error}`);
    }
  }

  /**
   * Ensure the port is ready before executing operation
   * 确保端口就绪后再执行操作
   */
  private ensureReady(fn: () => void): void {
    if (this.ready) {
      fn();
    } else {
      this.pendingOperations.push(fn);
    }
  }

  /**
   * Dispose the client
   * 释放客户端
   */
  dispose(): void {
    if (this.port) {
      this.port.close();
      this.port = null;
    }
    this.subscriptions.clear();
    this.pendingOperations = [];

    // Clear pending requests
    this.pendingRequests.forEach((req) => {
      clearTimeout(req.timeout);
      req.resolve(undefined);
    });
    this.pendingRequests.clear();

    this.ready = false;
  }
}
