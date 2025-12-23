import { BrowserWindow, screen, app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';
import { Logger, ILogger } from '@/infrastructure/logger';
import { WindowStoreOptions } from './window-manager.type';
import { WindowRegistry } from './core/WindowRegistry';
import { WindowOperator } from './core/WindowOperator';
import { WindowContextManager } from './core/WindowContextManager';
import { WindowStateManager } from './core/WindowStateManager';
import { DEFAULTS } from './constants';

/**
 * WindowStore - Window state management class (Refactored & Optimized)
 * WindowStore - 窗口状态管理类（已重构与优化）
 *
 * Facade that coordinates:
 * - WindowRegistry (Storage & Cleanup)
 * - WindowOperator (Actions)
 * - WindowContextManager (Persistence)
 * - WindowStateManager (State Persistence)
 *
 * @class
 */
export default class WindowStore extends EventEmitter {
  private readonly MAX_WINDOWS: number;
  protected enablePersistence: boolean = false;
  protected logger: ILogger;

  public get persistenceEnabled(): boolean {
    return this.enablePersistence;
  }

  // Core components
  private registry: WindowRegistry;
  private operator: WindowOperator;
  private contextManager: WindowContextManager;
  private stateManager: WindowStateManager;

  // Focus History Stack
  // 焦点历史栈
  private focusHistory: string[] = [];

  /**
   * Creates an instance of WindowStore
   * 创建 WindowStore 实例
   */
  constructor(options?: WindowStoreOptions) {
    super();
    this.logger = options?.logger || new Logger({ appName: 'WindowStore' });
    this.MAX_WINDOWS = options?.maxWindows || DEFAULTS.MAX_WINDOWS;
    this.enablePersistence = options?.enablePersistence ?? false;

    // Initialize core components
    this.registry = new WindowRegistry(this.logger);
    this.operator = new WindowOperator(this.logger);
    this.contextManager = new WindowContextManager(options?.contextPersistence, this.logger);
    this.stateManager = new WindowStateManager(this.logger, options?.stateKeeper);

    // Default enable cleanup protection
    // 默认启用清理保护
    if (options?.autoStartCleanup !== false) {
      this.startCleanupProtection(options?.cleanupInterval);
    }
  }

  // ========================================================================================
  // Focus Management
  // 焦点管理
  // ========================================================================================

  /**
   * Push window ID to focus history
   * 将窗口 ID 推入焦点历史
   */
  pushFocus(windowId: string): void {
    // Remove if exists (move to top)
    // 如果存在则移除（移动到顶部）
    this.focusHistory = this.focusHistory.filter((id) => id !== windowId);
    this.focusHistory.push(windowId);
  }

  /**
   * Remove window ID from focus history
   * 从焦点历史中移除窗口 ID
   */
  removeFocus(windowId: string): void {
    this.focusHistory = this.focusHistory.filter((id) => id !== windowId);
  }

  /**
   * Get the previously focused window ID (excluding current top if needed)
   * 获取上一个聚焦的窗口 ID
   */
  getPreviousFocusedWindow(): string | undefined {
    // Current top is the active one. We want the one before it.
    // 当前栈顶是活动窗口。我们需要它之前的一个。
    if (this.focusHistory.length < 2) {
      return undefined;
    }
    return this.focusHistory[this.focusHistory.length - 2];
  }

  /**
   * Pop the top window from history
   * 弹出栈顶窗口
   */
  popFocus(): string | undefined {
    return this.focusHistory.pop();
  }

  // ========================================================================================
  // Group Management Actions
  // 窗口组管理操作
  // ========================================================================================

  joinGroup(windowId: string, group: string): void {
    this.registry.addToGroup(windowId, group);
  }

  leaveGroup(windowId: string, group: string): void {
    this.registry.removeFromGroup(windowId, group);
  }

  getGroup(group: string): string[] {
    return this.registry.getGroupIds(group);
  }

  /**
   * Close all windows in a group
   * 关闭组内所有窗口
   */
  async closeGroup(group: string): Promise<void> {
    const ids = this.registry.getGroupIds(group);
    if (!ids || ids.length === 0) return;

    const tasks = ids.map((id) => {
      return new Promise<void>((resolve) => {
        try {
          // Use setTimeout to allow UI updates between closes if many windows
          // 使用 setTimeout 允许 UI 更新，如果有许多窗口
          setImmediate(() => {
            this.operator.destroy(this.getTargetWindow(id));
            resolve();
          });
        } catch (error) {
          this.logger.error(`Failed to close window ${id} in group ${group}: ${error}`);
          resolve();
        }
      });
    });

    await Promise.all(tasks);
  }

  /**
   * Hide all windows in a group
   * 隐藏组内所有窗口
   */
  hideGroup(group: string): void {
    const ids = this.registry.getGroupIds(group);
    ids.forEach((id) => this.hide(id));
  }

  /**
   * Show all windows in a group
   * 显示组内所有窗口
   */
  showGroup(group: string): void {
    const ids = this.registry.getGroupIds(group);
    ids.forEach((id) => {
      const win = this.getTargetWindow(id);
      if (win) this.show(win);
    });
  }

  /**
   * Focus all windows in a group
   * 聚焦组内所有窗口
   */
  focusGroup(group: string): void {
    const ids = this.registry.getGroupIds(group);
    ids.forEach((id) => this.focus(id));
  }

  show(window: BrowserWindow, _windowId?: string): void {
    this.operator.show(window);
  }

  hide(windowId: string): void {
    const window = this.getTargetWindow(windowId);
    if (window) this.operator.hide(window);
  }

  isDestroyed(windowId: string): boolean {
    const window = this.getTargetWindow(windowId);
    return !window || window.isDestroyed();
  }

  isVisible(windowId: string): boolean {
    const window = this.getValidWindow(windowId);
    return window?.isVisible() || false;
  }

  isMinimized(windowId: string): boolean {
    return this.getTargetWindow(windowId)?.isMinimized() || false;
  }

  isMaximized(windowId: string): boolean {
    return this.getTargetWindow(windowId)?.isMaximized() || false;
  }

  fullScreenState(windowId: string): boolean {
    return this.getTargetWindow(windowId)?.isFullScreen() || false;
  }

  minimize(windowId?: string): void {
    const window = this.getTargetWindow(windowId);
    if (window) this.operator.minimize(window);
  }

  restore(windowId: string): void {
    const window = this.getValidWindow(windowId);
    if (window) this.operator.restore(window);
  }

  maximize(windowId: string): void {
    const window = this.getValidWindow(windowId);
    if (window) this.operator.maximize(window);
  }

  unmaximize(windowId: string): void {
    const window = this.getValidWindow(windowId);
    if (window) this.operator.unmaximize(window);
  }

  fullScreen(windowId: string): void {
    const window = this.getValidWindow(windowId);
    if (window) this.operator.toggleFullScreen(window);
  }

  focus(windowId: string): void {
    const window = this.getValidWindow(windowId);
    if (window) this.operator.focus(window);
  }

  setMovable(window: BrowserWindow): void {
    window.setMovable(true);
  }

  winClose(windowId: string): void {
    this.removeWindow(windowId);
  }

  openDevTools(windowId: string): void {
    const window = this.getTargetWindow(windowId);
    if (window) this.operator.openDevTools(window);
  }

  isDevToolsOpened(windowId: string): boolean {
    const window = this.getTargetWindow(windowId);
    return window ? this.operator.isDevToolsOpened(window) : false;
  }

  closeDevTools(windowId: string): void {
    const window = this.getTargetWindow(windowId);
    if (window) this.operator.closeDevTools(window);
  }

  quit(): void {
    app.quit();
  }

  getWindowSize(): { width: number; height: number } {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return { width, height };
  }

  send(windowId: string, name: string, data: unknown = ''): void {
    const window = this.getTargetWindow(windowId);
    if (window) this.operator.send(window, name, data);
  }

  setSkipTaskbar(windowId: string, bool: boolean): void {
    const window = this.getTargetWindow(windowId);
    if (window) this.operator.setSkipTaskbar(window, bool);
  }

  // ========================================================================================
  // Property Accessors (Delegated to WindowRegistry)
  // 属性访问器（委托给 WindowRegistry）
  // ========================================================================================

  public get mainWindow(): BrowserWindow | null {
    return this.registry.getMainWindow();
  }

  protected set mainWindow(window: BrowserWindow | null) {
    this.registry.setMainWindow(window);
  }

  getWindowCount(): number {
    return this.registry.getCount();
  }

  getAllWindowKeys(): string[] {
    return this.registry.getAllIds();
  }

  getAllWindows(): BrowserWindow[] {
    return this.registry.getAllWindows();
  }

  getWindowNames(): Map<string, string> {
    return this.registry.getNameMap();
  }

  getNameByWindowId(windowId: string): string | undefined {
    return this.registry.getNameById(windowId);
  }

  getWindowByNameId(name: string): string | undefined {
    return this.registry.getIdByName(name);
  }

  getWindowByName(name: string): BrowserWindow | undefined {
    return this.registry.getByName(name);
  }

  hasByName(proposedName: string): boolean {
    return this.registry.hasName(proposedName);
  }

  deleteByName(proposedName: string): boolean {
    const id = this.registry.getIdByName(proposedName);
    if (id) {
      this.registry.unregister(id);
      return true;
    }
    return false;
  }

  getWindowById(windowId: string): BrowserWindow | undefined {
    return this.registry.getById(windowId);
  }

  hasById(windowId: string): boolean {
    return this.registry.hasId(windowId);
  }

  deleteById(windowId: string): boolean {
    if (this.registry.hasId(windowId)) {
      this.registry.unregister(windowId);
      return true;
    }
    return false;
  }

  getWindowId(window: BrowserWindow): string | undefined {
    return this.registry.getIdByWindow(window);
  }

  updateWindowName(windowId: string, newName: string): void {
    this.registry.updateWindowName(windowId, newName);
  }

  // ========================================================================================
  // Helper Methods
  // 辅助方法
  // ========================================================================================

  getTargetWindow(windowId?: string): BrowserWindow | undefined {
    if (!windowId) {
      return this.getCurrentWindow();
    }
    return this.registry.getById(windowId) || this.registry.getByName(windowId);
  }

  getValidWindow(windowId?: string): BrowserWindow | undefined {
    const window = this.getTargetWindow(windowId);
    if (!window || window.isDestroyed()) {
      this.logger.warn(`Window ${windowId || 'current'} not found or destroyed`);
      return undefined;
    }
    return window;
  }

  getCurrentWindow(): BrowserWindow | undefined {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow && !focusedWindow.isDestroyed()) return focusedWindow;
    return this.mainWindow ?? undefined;
  }

  // ========================================================================================
  // Core Logic (Creation & Removal)
  // 核心逻辑（创建与移除）
  // ========================================================================================

  createWindow(
    window: BrowserWindow,
    config?: { name?: string; windowId?: string; enablePersistence?: boolean }
  ): string {
    if (this.registry.getCount() >= this.MAX_WINDOWS) {
      const error = new Error(`Maximum window limit (${this.MAX_WINDOWS}) reached`);
      this.logger.error(error.message);
      throw error;
    }

    const windowId = config?.windowId || uuidv4();
    let windowName = config?.name || `window-${windowId}`;

    try {
      windowName = this.validateWindowName(windowName);
    } catch {
      this.logger.warn(`Window name "${windowName}" already exists, generating unique name`);
      windowName = `${windowName}-${Date.now()}`;
    }

    this.registerWindow(windowId, windowName, window, {
      enablePersistence: config?.enablePersistence,
    });
    return windowId;
  }

  removeWindow(windowId: string): void {
    const window = this.registry.getById(windowId);

    if (window && !window.isDestroyed()) {
      try {
        // Operator handles safe closing
        // Operator 处理安全关闭
        this.operator.close(window);

        // Ensure destruction
        // 确保销毁
        if (!window.isDestroyed()) {
          this.operator.destroy(window);
        }
      } catch (error) {
        this.logger.error(`Failed to remove window ${windowId}: ${error}`);
        this.emit('error', error);
      }
    }

    // Always unregister from registry
    // 始终从注册表中注销
    this.registry.unregister(windowId);
  }

  private validateWindowName(proposedName: string): string {
    if (this.registry.hasName(proposedName)) {
      throw new Error(`Window name "${proposedName}" already exists`);
    }
    return proposedName;
  }

  private registerWindow(
    id: string,
    name: string,
    window: BrowserWindow,
    options?: { enablePersistence?: boolean }
  ): void {
    this.registry.register(id, name, window);

    if (options?.enablePersistence ?? this.enablePersistence) {
      this.stateManager.manage(name, window);
    }
  }

  manageState(name: string, window: BrowserWindow, getGroups?: () => string[]): void {
    this.stateManager.manage(name, window, getGroups);
  }

  getWindowGroups(windowId: string): string[] {
    return this.registry.getWindowGroups(windowId);
  }

  getWindowState(name: string, defaultWidth?: number, defaultHeight?: number) {
    return this.stateManager.getState(name, defaultWidth, defaultHeight);
  }

  // ========================================================================================
  // Context Management (Delegated to WindowContextManager)
  // 上下文管理（委托给 WindowContextManager）
  // ========================================================================================

  async saveWindowContext(windowId: string, context: any): Promise<void> {
    await this.contextManager.save(windowId, context);
  }

  async loadWindowContext(windowId: string): Promise<any> {
    return await this.contextManager.load(windowId);
  }

  async clearWindowContext(windowId: string): Promise<void> {
    await this.contextManager.clear(windowId);
  }

  // ========================================================================================
  // Cleanup Protection (Delegated to WindowRegistry)
  // 清理防护（委托给 WindowRegistry）
  // ========================================================================================

  public startCleanupProtection(intervalMs: number = DEFAULTS.CLEANUP_INTERVAL): void {
    this.registry.startCleanupProtection(intervalMs);
  }

  public stopCleanupProtection(): void {
    this.registry.stopCleanupProtection();
  }

  public async dispose(): Promise<void> {
    this.logger.info('Disposing WindowStore...');
    this.stopCleanupProtection();

    // Close all windows
    const windows = this.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.close();
      }
    }

    // Clear registry
    this.registry.clear();
    this.logger.info('WindowStore disposed');
  }
}
