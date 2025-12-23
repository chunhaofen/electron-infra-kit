import { ILogger } from '@/infrastructure/logger';

export interface TransactionOperation {
  type: 'set' | 'delete';
  value?: any;
}

/**
 * TransactionManager - Manages data transactions for windows
 * TransactionManager - 管理窗口的数据事务
 */
export class TransactionManager {
  // Transaction buffers: windowId -> Map<key, operation>
  // 事务缓冲区：windowId -> Map<key, operation>
  private buffers: Map<string, Map<string, TransactionOperation>> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Start a transaction
   * 开启事务
   */
  start(windowId: string): void {
    if (this.buffers.has(windowId)) {
      this.logger.warn(`Transaction already started for window ${windowId}`);
      return;
    }
    this.buffers.set(windowId, new Map());
  }

  /**
   * Commit a transaction
   * 提交事务
   * @returns The buffered operations to apply, or undefined if no transaction exists
   */
  commit(windowId: string): Map<string, TransactionOperation> | undefined {
    const buffer = this.buffers.get(windowId);
    if (!buffer) {
      this.logger.warn(`No transaction to commit for window ${windowId}`);
      return undefined;
    }
    this.buffers.delete(windowId);
    return buffer;
  }

  /**
   * Rollback a transaction
   * 回滚事务
   */
  rollback(windowId: string): void {
    if (!this.buffers.has(windowId)) {
      this.logger.warn(`No transaction to rollback for window ${windowId}`);
      return;
    }
    this.buffers.delete(windowId);
  }

  /**
   * Add operation to transaction
   * 添加操作到事务
   * @returns true if operation was buffered, false if no transaction is active
   */
  add(windowId: string, key: string, op: TransactionOperation): boolean {
    if (this.buffers.has(windowId)) {
      this.buffers.get(windowId)!.set(key, op);
      return true;
    }
    return false;
  }

  /**
   * Check if a transaction is active for a window
   * 检查窗口是否有活跃事务
   */
  hasTransaction(windowId: string): boolean {
    return this.buffers.has(windowId);
  }

  /**
   * Get value from transaction buffer
   * 从事务缓冲区获取值
   */
  getBufferedValue(windowId: string, key: string): { has: boolean; value?: any } {
    if (this.buffers.has(windowId)) {
      const buffer = this.buffers.get(windowId)!;
      if (buffer.has(key)) {
        const op = buffer.get(key)!;
        if (op.type === 'set') {
          return { has: true, value: op.value };
        } else {
          // It's a delete operation, so effectively the value is undefined (but we know it's "set" to be deleted)
          return { has: true, value: undefined };
        }
      }
    }
    return { has: false };
  }

  /**
   * Clear all transactions
   * 清除所有事务
   */
  clear(): void {
    this.buffers.clear();
  }
}
