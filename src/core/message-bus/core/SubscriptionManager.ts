import { ILogger } from '@/infrastructure/logger';

/**
 * SubscriptionManager - Manages message subscriptions
 * SubscriptionManager - 管理消息订阅
 */
export class SubscriptionManager {
  // Key subscriptions map: key -> Set<windowId>
  // 键值订阅映射：key -> Set<windowId>
  private subscriptions: Map<string, Set<string>> = new Map();
  private logger?: ILogger;
  private readonly MAX_SUBSCRIPTIONS_PER_KEY = 100;

  constructor(logger?: ILogger) {
    this.logger = logger;
  }

  /**
   * Subscribe to keys
   * 订阅键
   */
  subscribe(windowId: string, keys: string[]): void {
    keys.forEach((key) => {
      if (!this.subscriptions.has(key)) {
        this.subscriptions.set(key, new Set());
      }
      const subscribers = this.subscriptions.get(key)!;
      subscribers.add(windowId);

      // Check for potential memory leak / high usage
      if (this.logger && subscribers.size > this.MAX_SUBSCRIPTIONS_PER_KEY) {
        // Debounce warning or just warn? For now just warn.
        // Avoid flooding logs? Maybe only warn on exact multiples or just > 100
        if (subscribers.size === this.MAX_SUBSCRIPTIONS_PER_KEY + 1) {
          this.logger.warn(
            `High number of subscriptions (${subscribers.size}) for key: "${key}". Potential memory leak or design issue.`
          );
        }
      }
    });
  }

  /**
   * Unsubscribe from keys
   * 取消订阅键
   */
  unsubscribe(windowId: string, keys: string[]): void {
    keys.forEach((key) => {
      const subscribers = this.subscriptions.get(key);
      if (subscribers) {
        subscribers.delete(windowId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    });
  }

  /**
   * Remove all subscriptions for a window
   * 移除窗口的所有订阅
   */
  removeWindow(windowId: string): void {
    this.subscriptions.forEach((subscribers, key) => {
      if (subscribers.has(windowId)) {
        subscribers.delete(windowId);
        if (subscribers.size === 0) {
          this.subscriptions.delete(key);
        }
      }
    });
  }

  /**
   * Get subscribers for a key
   * 获取键的订阅者
   */
  getSubscribers(key: string): Set<string> | undefined {
    return this.subscriptions.get(key);
  }

  /**
   * Clear all subscriptions
   * 清除所有订阅
   */
  clear(): void {
    this.subscriptions.clear();
  }
}
