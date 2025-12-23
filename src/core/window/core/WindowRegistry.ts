import { BrowserWindow } from 'electron';
import { ILogger } from '@/infrastructure/logger';

/**
 * WindowRegistry - Manages the mapping and storage of window instances
 * 窗口注册表 - 管理窗口实例的映射和存储
 */
export class WindowRegistry {
  /**
   * Map of window ID to BrowserWindow instance
   * 窗口 ID 到 BrowserWindow 实例的映射
   */
  private windows: Map<string, BrowserWindow> = new Map();

  /**
   * Map of window name to window ID
   * 窗口名称到窗口 ID 的映射
   */
  private windowNames: Map<string, string> = new Map();

  /**
   * Map of window ID to window name (Reverse index)
   * 窗口 ID 到窗口名称的映射（反向索引）
   */
  private windowIds: Map<string, string> = new Map();

  /**
   * Map of BrowserWindow instance to window ID
   * BrowserWindow 实例到窗口 ID 的映射
   */
  private windowInstanceIds: Map<BrowserWindow, string> = new Map();

  /**
   * The main window instance reference
   * 主窗口实例引用
   */
  private _mainWindow: BrowserWindow | null = null;

  /**
   * Map of group name to set of window IDs
   * 组名到窗口 ID 集合的映射
   */
  private groups: Map<string, Set<string>> = new Map();

  /**
   * Map of window ID to set of group names (Reverse index for cleanup)
   * 窗口 ID 到组名集合的映射（用于清理的反向索引）
   */
  private windowGroups: Map<string, Set<string>> = new Map();

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private logger: ILogger) {}

  /**
   * Registers a window
   * 注册窗口
   */
  register(id: string, name: string, window: BrowserWindow): void {
    this.windows.set(id, window);
    this.windowNames.set(name, id);
    this.windowIds.set(id, name);
    this.windowInstanceIds.set(window, id);

    if (!this._mainWindow) {
      this._mainWindow = window;
    }
  }

  /**
   * Unregisters a window
   * 注销窗口
   */
  unregister(id: string): void {
    // Clean up groups first
    const associatedGroups = this.windowGroups.get(id);
    if (associatedGroups) {
      associatedGroups.forEach((groupName) => {
        const group = this.groups.get(groupName);
        if (group) {
          group.delete(id);
          if (group.size === 0) {
            this.groups.delete(groupName);
          }
        }
      });
      this.windowGroups.delete(id);
    }

    const name = this.windowIds.get(id);
    if (name) this.windowNames.delete(name);

    const window = this.windows.get(id);
    if (window) {
      this.windowInstanceIds.delete(window);
      if (this._mainWindow === window) {
        this._mainWindow = null;
      }
    }

    this.windows.delete(id);
    this.windowIds.delete(id);
  }

  /**
   * Adds a window to a group
   * 将窗口添加到组
   */
  addToGroup(id: string, group: string): void {
    if (!this.windows.has(id)) {
      this.logger.warn(`Cannot add non-existent window ${id} to group ${group}`);
      return;
    }

    if (!this.groups.has(group)) {
      this.groups.set(group, new Set());
    }
    this.groups.get(group)!.add(id);

    if (!this.windowGroups.has(id)) {
      this.windowGroups.set(id, new Set());
    }
    this.windowGroups.get(id)!.add(group);
  }

  /**
   * Removes a window from a group
   * 将窗口从组中移除
   */
  removeFromGroup(id: string, group: string): void {
    const groupSet = this.groups.get(group);
    if (groupSet) {
      groupSet.delete(id);
      if (groupSet.size === 0) {
        this.groups.delete(group);
      }
    }

    const windowGroupSet = this.windowGroups.get(id);
    if (windowGroupSet) {
      windowGroupSet.delete(group);
      if (windowGroupSet.size === 0) {
        this.windowGroups.delete(id);
      }
    }
  }

  /**
   * Get all window IDs in a group
   * 获取组内所有窗口 ID
   */
  getGroupIds(group: string): string[] {
    const groupSet = this.groups.get(group);
    return groupSet ? Array.from(groupSet) : [];
  }

  /**
   * Get all groups a window belongs to
   * 获取窗口所属的所有组
   */
  getWindowGroups(id: string): string[] {
    const groupSet = this.windowGroups.get(id);
    return groupSet ? Array.from(groupSet) : [];
  }

  /**
   * Clears all registered windows
   * 清除所有注册的窗口
   */
  clear(): void {
    this.windows.clear();
    this.windowNames.clear();
    this.windowIds.clear();
    this.windowInstanceIds.clear();
    this.groups.clear();
    this.windowGroups.clear();
    this._mainWindow = null;
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get window by ID
   * 根据 ID 获取窗口
   */
  getById(id: string): BrowserWindow | undefined {
    return this.windows.get(id);
  }

  /**
   * Get window ID by Name
   * 根据名称获取窗口 ID
   */
  getIdByName(name: string): string | undefined {
    return this.windowNames.get(name);
  }

  /**
   * Get window by Name
   * 根据名称获取窗口
   */
  getByName(name: string): BrowserWindow | undefined {
    const id = this.windowNames.get(name);
    return id ? this.windows.get(id) : undefined;
  }

  /**
   * Get name by ID
   * 根据 ID 获取名称
   */
  getNameById(id: string): string | undefined {
    return this.windowIds.get(id);
  }

  /**
   * Get ID by Window instance
   * 根据窗口实例获取 ID
   */
  getIdByWindow(window: BrowserWindow): string | undefined {
    return this.windowInstanceIds.get(window);
  }

  /**
   * Check if window exists by ID
   * 检查指定 ID 的窗口是否存在
   */
  hasId(id: string): boolean {
    return this.windows.has(id);
  }

  /**
   * Check if window exists by Name
   * 检查指定名称的窗口是否存在
   */
  hasName(name: string): boolean {
    return this.windowNames.has(name);
  }

  /**
   * Get all window IDs
   * 获取所有窗口 ID
   */
  getAllIds(): string[] {
    return Array.from(this.windows.keys());
  }

  /**
   * Get all windows
   * 获取所有窗口
   */
  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Get window name map
   * 获取窗口名称映射
   */
  getNameMap(): Map<string, string> {
    return this.windowNames;
  }

  /**
   * Get total count
   * 获取总数
   */
  getCount(): number {
    return this.windows.size;
  }

  /**
   * Set main window
   * 设置主窗口
   */
  setMainWindow(window: BrowserWindow | null) {
    this._mainWindow = window;
  }

  /**
   * Get main window
   * 获取主窗口
   */
  getMainWindow(): BrowserWindow | null {
    return this._mainWindow;
  }

  /**
   * Update window name
   * 更新窗口名称
   */
  updateWindowName(id: string, newName: string): void {
    const currentName = this.windowIds.get(id);
    if (currentName) {
      this.windowNames.delete(currentName);
    }
    this.windowNames.set(newName, id);
    this.windowIds.set(id, newName);
  }

  /**
   * Start periodic cleanup protection
   * 开启定期清理防护
   */
  startCleanupProtection(intervalMs: number = 30000): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupDestroyedWindows();
    }, intervalMs);

    this.cleanupTimer.unref();
  }

  /**
   * Stop periodic cleanup protection
   * 停止定期清理防护
   */
  stopCleanupProtection(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Cleanup destroyed windows from internal maps
   * 从内部映射中清理已销毁的窗口
   */
  private cleanupDestroyedWindows(): void {
    const CHUNK_SIZE = 50; // Process 50 windows per tick

    // If we have a small number of windows, process synchronously
    // 如果窗口数量较少，同步处理
    if (this.windows.size <= CHUNK_SIZE) {
      this.performCleanup(Array.from(this.windows.entries()));
      return;
    }

    // Large number of windows: Process in chunks
    // 窗口数量较多：分块处理
    const entries = Array.from(this.windows.entries());
    this.processCleanupChunk(entries, 0, CHUNK_SIZE);
  }

  private processCleanupChunk(
    entries: [string, BrowserWindow][],
    startIndex: number,
    chunkSize: number
  ): void {
    if (startIndex >= entries.length) return;

    const endIndex = Math.min(startIndex + chunkSize, entries.length);
    const chunk = entries.slice(startIndex, endIndex);

    this.performCleanup(chunk);

    // Schedule next chunk
    if (endIndex < entries.length) {
      setImmediate(() => {
        this.processCleanupChunk(entries, endIndex, chunkSize);
      });
    }
  }

  private performCleanup(entries: [string, BrowserWindow][]): void {
    const destroyedIds: string[] = [];

    entries.forEach(([id, win]) => {
      if (win.isDestroyed()) {
        destroyedIds.push(id);
      }
    });

    if (destroyedIds.length > 0) {
      this.logger.warn(
        `Found ${destroyedIds.length} destroyed windows in registry. Cleaning up...`
      );
      destroyedIds.forEach((id) => this.unregister(id));
    }
  }
}
