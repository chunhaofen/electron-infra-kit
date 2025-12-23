import { DataStoreItem, FieldPermission } from '../message-bus.type';

/**
 * DataStoreManager - Manages the shared data state and permissions
 * DataStoreManager - 管理共享数据状态和权限
 */
export class DataStoreManager {
  private dataStore: Map<string, DataStoreItem> = new Map();

  /**
   * Get data value
   * 获取数据值
   */
  get(key: string): any {
    return this.dataStore.get(key)?.value;
  }

  /**
   * Get item (including permission)
   * 获取项（包含权限）
   */
  getItem(key: string): DataStoreItem | undefined {
    return this.dataStore.get(key);
  }

  /**
   * Get all data as object
   * 获取所有数据对象
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    this.dataStore.forEach((item, k) => {
      result[k] = item.value;
    });
    return result;
  }

  /**
   * Set data value
   * 设置数据值
   */
  set(key: string, value: any): void {
    const item = this.dataStore.get(key);
    this.dataStore.set(key, {
      value,
      permission: item?.permission,
    });
  }

  /**
   * Delete data
   * 删除数据
   */
  delete(key: string): void {
    this.dataStore.delete(key);
  }

  /**
   * Check permission
   * 检查权限
   */
  checkPermission(
    key: string,
    windowId: string | undefined,
    operation: 'modify' | 'delete'
  ): { success: boolean; error?: string } {
    const item = this.dataStore.get(key);

    if (item?.permission) {
      // Normalize permission to object if it's a string
      // 如果权限是字符串，则将其标准化为对象
      const permission =
        typeof item.permission === 'string' ? { mode: item.permission } : item.permission;

      if (permission.readonly) {
        return { success: false, error: `Field "${key}" is readonly` };
      }

      if (permission.allowedWindows && windowId) {
        if (!permission.allowedWindows.includes(windowId)) {
          return {
            success: false,
            error: `Window "${windowId}" is not allowed to ${operation} "${key}"`,
          };
        }
      }
    }

    return { success: true };
  }

  /**
   * Set field permission
   * 设置字段权限
   */
  setPermission(key: string, permission: FieldPermission): void {
    const item = this.dataStore.get(key);
    if (item) {
      item.permission = permission;
    } else {
      this.dataStore.set(key, { value: undefined, permission });
    }
  }

  /**
   * Clear all data
   * 清除所有数据
   */
  clear(): void {
    this.dataStore.clear();
  }
}
