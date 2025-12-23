import { IContextPersistence } from '../window-manager.type';
import { ILogger } from '@/infrastructure/logger';

/**
 * WindowContextManager - Manages window context persistence
 * 窗口上下文管理器 - 管理窗口上下文持久化
 */
export class WindowContextManager {
  constructor(
    private persistence: IContextPersistence | undefined,
    private logger: ILogger
  ) {}

  /**
   * Save window context
   * 保存窗口上下文
   */
  async save(windowId: string, context: any): Promise<void> {
    if (!this.persistence) {
      this.logger.warn('Context persistence is not enabled');
      return;
    }
    try {
      await this.persistence.save(windowId, context);
    } catch (error) {
      this.logger.error(`Failed to save context for window ${windowId}: ${error}`);
    }
  }

  /**
   * Load window context
   * 加载窗口上下文
   */
  async load(windowId: string): Promise<any> {
    if (!this.persistence) {
      return null;
    }
    try {
      return await this.persistence.load(windowId);
    } catch (error) {
      this.logger.error(`Failed to load context for window ${windowId}: ${error}`);
      return null;
    }
  }

  /**
   * Clear window context
   * 清除窗口上下文
   */
  async clear(windowId: string): Promise<void> {
    if (!this.persistence) {
      return;
    }
    try {
      await this.persistence.clear(windowId);
    } catch (error) {
      this.logger.error(`Failed to clear context for window ${windowId}: ${error}`);
    }
  }
}
