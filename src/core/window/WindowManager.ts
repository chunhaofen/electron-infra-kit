import { BrowserWindow, shell, BrowserWindowConstructorOptions } from 'electron';
import { TypedEmitter } from 'tiny-typed-emitter';
import { Logger, ILogger } from '@/infrastructure/logger';
import { validateWindowManagerConfig } from './window-manager.schema';
import WindowStore from './WindowStore';
import type {
  WindowManagerConfig,
  WindowManagerPlugin,
  WindowCreationOptions,
  WindowManagerEvents,
} from './window-manager.type';
import type IpcRouter from '@/core/ipc/IpcRouter';
import type { IIpcTransport } from '@/core/ipc/transport/ipc.type';
import type { MessageBus } from '@/core/message-bus/MessageBus';
import { IpcSetup } from './IpcSetup';
import { MetricsManager } from './core/MetricsManager';
import { PluginExecutor } from './core/PluginExecutor';
import { WindowLifecycle } from './core/WindowLifecycle';
import { PerformanceMonitor } from '@/infrastructure/debug';

/**
 * WindowManager - Core class for managing Electron windows
 * WindowManager - 管理 Electron 窗口的核心类
 *
 * Uses WindowStore via composition to handle window management
 * 使用组合方式通过 WindowStore 处理窗口管理
 */
export default class WindowManager extends TypedEmitter<WindowManagerEvents> {
  public config: WindowManagerConfig = {};
  public ipcRouter?: IpcRouter;
  public ipcTransport?: IIpcTransport;
  public messageBus?: MessageBus;
  protected currentIpcChannel: string | null = null;
  protected currentIpcSyncChannel: string | null = null;
  public logger: ILogger;

  // Composition: The internal WindowStore instance
  // 组合：内部 WindowStore 实例
  public readonly windowStore: WindowStore;

  // Core Managers
  protected metricsManager: MetricsManager;
  protected pluginExecutor: PluginExecutor;
  protected lifecycle: WindowLifecycle;

  private isInitialized = false;
  private initPromise: Promise<void>;
  private initError: Error | null = null;

  /**
   * Constructor
   * 构造函数
   * @param config - WindowManager configuration
   */
  constructor(config: WindowManagerConfig = {}) {
    super();
    // Validate config using Zod schema (Task 2)
    // 使用 Zod schema 验证配置 (任务 2)
    const validationResult = validateWindowManagerConfig(config);
    if (!validationResult.success) {
      throw new Error(`Invalid WindowManager configuration: ${validationResult.error}`);
    }
    this.config = validationResult.data as WindowManagerConfig;

    this.ipcRouter = this.config.ipcRouter;
    this.ipcTransport = this.config.ipcTransport;
    this.messageBus = this.config.messageBus;
    this.logger = this.config.logger || new Logger({ appName: 'WindowManager' });

    // Runtime validation for optional dependencies
    // 可选依赖的运行时验证
    if (config.logger) {
      const requiredMethods = ['info', 'warn', 'error', 'debug'];
      for (const method of requiredMethods) {
        if (typeof (config.logger as any)[method] !== 'function') {
          throw new Error(`config.logger must have ${requiredMethods.join('/')} methods`);
        }
      }
    }
    if (config.ipcRouter && typeof config.ipcRouter.handle !== 'function') {
      throw new Error('config.ipcRouter must have handle/addHandler methods');
    }

    // Initialize WindowStore with nested store configuration
    // 使用嵌套的 store 配置初始化 WindowStore
    this.windowStore = new WindowStore({
      logger: this.logger,
      ...(config.store || {}), // Spread nested store config
    });

    // Forward error events
    this.windowStore.on('error', (err) => this.emit('error', err));

    // Initialize Managers
    this.metricsManager = new MetricsManager();
    this.pluginExecutor = new PluginExecutor(this.logger, config.plugins, config.hooks);
    this.lifecycle = new WindowLifecycle(
      this,
      this.pluginExecutor,
      this.metricsManager,
      this.logger
    );

    // Initialize group resolver for MessageBus if available
    // 如果 MessageBus 可用，初始化分组解析器
    if (this.messageBus) {
      this.messageBus.setGroupResolver((group) => this.windowStore.getGroup(group));
    }

    // Initialize plugins (Async, properly handle errors)
    // 初始化插件（异步，正确处理错误）
    this.initPromise = this.init()
      .then(async () => {
        // Auto-initialize IPC after plugins are ready
        // 插件就绪后自动初始化 IPC
        if (this.ipcRouter && this.config.ipc?.autoInit !== false) {
          try {
            this.setupIPC();
          } catch (e) {
            this.logger.warn(`Auto IPC setup failed: ${e}`);
            throw e;
          }
        }
      })
      .catch((err) => {
        this.initError = err instanceof Error ? err : new Error(String(err));
        this.logger.error(`WindowManager initialization failed: ${this.initError.message}`);
        this.emit('error', this.initError);
        throw this.initError;
      });
  }

  /**
   * Returns a promise that resolves when initialization is complete
   * 返回一个 Promise，当初始化完成时 resolve
   * @throws {Error} If initialization failed
   */
  public async ready(): Promise<void> {
    if (this.initError) {
      throw this.initError;
    }
    return this.initPromise;
  }

  /**
   * Check if WindowManager is initialized
   * 检查 WindowManager 是否已初始化
   */
  public get initialized(): boolean {
    return this.isInitialized && !this.initError;
  }

  /**
   * Get initialization error if any
   * 获取初始化错误（如果有）
   */
  public get initializationError(): Error | null {
    return this.initError;
  }

  /**
   * Initialize plugins
   * 初始化插件
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    await this.pluginExecutor.initPlugins(this);
  }

  /**
   * Register a plugin
   * 注册插件
   * @param plugin - Plugin instance
   */
  public use(plugin: WindowManagerPlugin): this {
    this.pluginExecutor.addPlugin(plugin);

    // If already initialized, initialize the new plugin immediately
    if (this.isInitialized) {
      this.pluginExecutor.initPlugin(plugin, this);
    }

    return this;
  }

  /**
   * Setup IPC communication
   * 设置 IPC 通信
   * @param options - Optional IPC configuration (可选的 IPC 配置)
   */
  public setupIPC(options?: {
    channel?: string;
    syncChannel?: string;
    setupImpl?: typeof IpcSetup.setup;
  }): void {
    let result: { channel: string; syncChannel: string; ipcTransport?: IIpcTransport };

    if (options?.setupImpl) {
      result = options.setupImpl({
        config: this.config,
        ipcRouter: this.ipcRouter!,
        currentIpcChannel: this.currentIpcChannel,
        currentIpcSyncChannel: this.currentIpcSyncChannel,
        options,
      });
    } else if (this.config.ipcSetup) {
      result = this.config.ipcSetup(this, options);
    } else {
      result = IpcSetup.setup({
        config: this.config,
        ipcRouter: this.ipcRouter!,
        currentIpcChannel: this.currentIpcChannel,
        currentIpcSyncChannel: this.currentIpcSyncChannel,
        options,
      });
    }

    if (result) {
      this.currentIpcChannel = result.channel;
      this.currentIpcSyncChannel = result.syncChannel;
      if (result.ipcTransport) {
        this.ipcTransport = result.ipcTransport;
      }
      return;
    }

    if (!this.ipcRouter) {
      throw new Error(
        'IpcRouter instance is required for IPC setup. Please pass it to the WindowManager constructor.'
      );
    }
  }

  /**
   * Create a new window
   * 创建一个新窗口
   * @param config - Configuration object (配置对象)
   * @returns Window ID (窗口 ID)
   */
  async create(config: WindowCreationOptions = {}): Promise<string> {
    const perf = PerformanceMonitor.getInstance();
    const measureId = `window-create-${Date.now()}`;

    perf.startMeasure(measureId, 'Window Creation', {
      name: config.name,
      width: config.width,
      height: config.height,
    });

    try {
      const windowId = await this.lifecycle.create(config);
      perf.endMeasure(measureId, { status: 'success', windowId });
      return windowId;
    } catch (error) {
      perf.endMeasure(measureId, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove window
   * 移除窗口
   * @param windowId - Window ID
   */
  public async removeWindow(windowId: string): Promise<void> {
    return this.lifecycle.removeWindow(windowId);
  }

  /**
   * Get performance metrics
   * 获取性能指标
   * @returns Performance metrics object
   */
  public getMetrics() {
    return this.metricsManager.getMetrics(this.getWindowCount());
  }

  /**
   * Dispose all resources
   * 释放所有资源
   */
  public dispose(): void {
    this.logger.info('Disposing WindowManager...');

    // 1. 清理所有窗口 (先关闭窗口，再清理 Store)
    const windowIds = this.getAllWindowKeys();
    windowIds.forEach((id) => {
      try {
        this.removeWindow(id);
      } catch (error) {
        this.logger.error(`Failed to remove window ${id}: ${error}`);
      }
    });

    // 2. Dispose WindowStore (stops cleanup timer & clears registry)
    this.windowStore.dispose();

    // 3. 清理 IPC
    if (this.ipcTransport) {
      this.ipcTransport.removeAllHandlers();
      this.ipcTransport.removeAllListeners();
    }

    if (this.ipcRouter && typeof (this.ipcRouter as any).dispose === 'function') {
      (this.ipcRouter as any).dispose();
    }

    // 4. 移除所有事件监听器
    this.removeAllListeners();

    this.logger.info('WindowManager disposed');
  }

  private getMainWindowId(): string | undefined {
    return this.windowStore.mainWindow
      ? this.windowStore.getWindowId(this.windowStore.mainWindow)
      : undefined;
  }

  public createBrowserWindow(config?: BrowserWindowConstructorOptions): BrowserWindow {
    const defaultConfig = this.getDefaultWindowConfig();
    return new BrowserWindow({ ...defaultConfig, ...config });
  }

  protected getDefaultWindowConfig(): BrowserWindowConstructorOptions {
    return (
      this.config.defaultConfig || {
        width: 800,
        height: 600,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      }
    );
  }

  public configureWindowBehavior(window: BrowserWindow, windowId: string): void {
    if (this.config.isDevelopment) {
      this.windowStore.openDevTools(windowId);
    }

    if (this.config.preventExternalLinks !== false) {
      window.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: 'deny' };
      });
    }

    window.once('ready-to-show', () => this.windowStore.show(window, windowId));

    window.on('closed', () => {
      this.windowStore.removeFocus(windowId);
      this.removeWindow(windowId);
    });

    // Handle render process crash
    // 处理渲染进程崩溃
    window.webContents.on('render-process-gone', (event, details) => {
      this.logger.error(
        `Window ${windowId} crashed: ${details.reason} (Exit Code: ${details.exitCode})`
      );

      const { reason } = details;

      // Attempt to reload for non-fatal crashes
      // 对于非致命崩溃尝试重新加载
      if (reason === 'crashed' || reason === 'oom') {
        this.logger.info(`Attempting to reload window ${windowId}...`);
        // Give it a small delay before reload
        setTimeout(() => {
          if (!window.isDestroyed()) {
            window.reload();
          }
        }, 1000);
      }
    });

    // Handle unresponsive window
    // 处理窗口无响应
    window.on('unresponsive', () => {
      this.logger.warn(`Window ${windowId} is unresponsive`);
    });

    // Track Focus
    // 追踪焦点
    window.on('focus', () => {
      this.windowStore.pushFocus(windowId);
    });

    // Also push focus immediately on creation if window is shown
    // 如果窗口显示，创建时也立即推入焦点
    if (window.isVisible() && window.isFocused()) {
      this.windowStore.pushFocus(windowId);
    }
  }

  // ========================================================================================
  // Group Management API
  // 窗口组管理 API
  // ========================================================================================

  /**
   * Join a window to a group
   * 将窗口加入组
   */
  joinGroup(windowId: string, group: string): void {
    this.windowStore.joinGroup(windowId, group);
  }

  /**
   * Leave a window from a group
   * 将窗口移出组
   */
  leaveGroup(windowId: string, group: string): void {
    this.windowStore.leaveGroup(windowId, group);
  }

  /**
   * Get all window IDs in a group
   * 获取组内所有窗口 ID
   */
  getGroup(group: string): string[] {
    return this.windowStore.getGroup(group);
  }

  /**
   * Close all windows in a group
   * 关闭组内所有窗口
   */
  async closeGroup(group: string): Promise<void> {
    await this.windowStore.closeGroup(group);
  }

  /**
   * Hide all windows in a group
   * 隐藏组内所有窗口
   */
  hideGroup(group: string): void {
    this.windowStore.hideGroup(group);
  }

  /**
   * Show all windows in a group
   * 显示组内所有窗口
   */
  showGroup(group: string): void {
    this.windowStore.showGroup(group);
  }

  /**
   * Focus all windows in a group
   * 聚焦组内所有窗口
   */
  focusGroup(group: string): void {
    this.windowStore.focusGroup(group);
  }

  /**
   * Send message to all windows in a group via MessageBus
   * 通过 MessageBus 向组内所有窗口发送消息
   * @param group - Group name (组名)
   * @param channel - Channel name (频道名称)
   * @param data - Message data (消息数据)
   * @returns Number of successful sends (成功发送的数量)
   */
  sendToGroup(group: string, channel: string, data: any): number {
    if (!this.messageBus) {
      this.logger.warn('[WindowManager.sendToGroup] MessageBus not configured');
      return 0;
    }
    const ids = this.windowStore.getGroup(group);
    return this.messageBus.broadcastToWindows(ids, channel, data);
  }

  /**
   * Focus previous window in history
   * 聚焦历史记录中的上一个窗口
   */
  focusPrevious(): void {
    const previousId = this.windowStore.getPreviousFocusedWindow();
    if (previousId) {
      this.windowStore.focus(previousId);
    }
  }

  // ========================================================================================
  // Validation Helpers
  // 验证辅助函数
  // ========================================================================================

  public validateWindowId(windowId: string | undefined | null, methodName: string): string {
    if (!windowId || typeof windowId !== 'string' || windowId.trim() === '') {
      throw new Error(`[WindowManager.${methodName}] Invalid windowId: must be a non-empty string`);
    }
    return windowId;
  }

  // ========================================================================================
  // Delegated Methods from WindowStore
  // ========================================================================================

  show(window: BrowserWindow, windowId?: string): void {
    if (!window || window.isDestroyed()) {
      this.logger.warn('[WindowManager.show] Window is null or destroyed');
      return;
    }
    // If windowId is provided, validate it. If not, it's optional in signature but good to check.
    if (windowId !== undefined) {
      this.validateWindowId(windowId, 'show');
    }
    this.windowStore.show(window, windowId);
  }

  hide(windowId: string): void {
    this.windowStore.hide(this.validateWindowId(windowId, 'hide'));
  }

  isDestroyed(windowId: string): boolean {
    // isDestroyed should be safe to call even with invalid ID (returns false)
    // but validateWindowId ensures we don't pass garbage
    return this.windowStore.isDestroyed(this.validateWindowId(windowId, 'isDestroyed'));
  }

  isVisible(windowId: string): boolean {
    return this.windowStore.isVisible(this.validateWindowId(windowId, 'isVisible'));
  }

  isMinimized(windowId: string): boolean {
    return this.windowStore.isMinimized(this.validateWindowId(windowId, 'isMinimized'));
  }

  isMaximized(windowId: string): boolean {
    return this.windowStore.isMaximized(this.validateWindowId(windowId, 'isMaximized'));
  }

  fullScreenState(windowId: string): boolean {
    return this.windowStore.fullScreenState(this.validateWindowId(windowId, 'fullScreenState'));
  }

  minimize(windowId?: string): void {
    if (windowId) this.validateWindowId(windowId, 'minimize');
    this.windowStore.minimize(windowId);
  }

  restore(windowId: string): void {
    this.windowStore.restore(this.validateWindowId(windowId, 'restore'));
  }

  maximize(windowId: string): void {
    this.windowStore.maximize(this.validateWindowId(windowId, 'maximize'));
  }

  unmaximize(windowId: string): void {
    this.windowStore.unmaximize(this.validateWindowId(windowId, 'unmaximize'));
  }

  fullScreen(windowId: string): void {
    this.windowStore.fullScreen(this.validateWindowId(windowId, 'fullScreen'));
  }

  focus(windowId: string): void {
    this.windowStore.focus(this.validateWindowId(windowId, 'focus'));
  }

  setMovable(window: BrowserWindow): void {
    if (!window || window.isDestroyed()) return;
    this.windowStore.setMovable(window);
  }

  /**
   * Close a window
   * 关闭窗口
   * @param windowId - Window ID (窗口 ID)
   */
  close(windowId: string): void {
    this.windowStore.winClose(this.validateWindowId(windowId, 'close'));
  }

  /**
   * @deprecated Use close() instead
   * @deprecated 使用 close() 代替
   */
  winClose(windowId: string): void {
    this.close(windowId);
  }

  openDevTools(windowId: string): void {
    this.windowStore.openDevTools(this.validateWindowId(windowId, 'openDevTools'));
  }

  isDevToolsOpened(windowId: string): boolean {
    return this.windowStore.isDevToolsOpened(this.validateWindowId(windowId, 'isDevToolsOpened'));
  }

  closeDevTools(windowId: string): void {
    this.windowStore.closeDevTools(this.validateWindowId(windowId, 'closeDevTools'));
  }

  quit(): void {
    this.windowStore.quit();
  }

  getWindowSize(): { width: number; height: number } {
    return this.windowStore.getWindowSize();
  }

  send(windowId: string, name: string, data: unknown = ''): void {
    this.windowStore.send(windowId, name, data);
  }

  setSkipTaskbar(windowId: string, bool: boolean): void {
    this.windowStore.setSkipTaskbar(windowId, bool);
  }

  // Property Accessors (Delegated)

  public get mainWindow(): BrowserWindow | null {
    return this.windowStore.mainWindow;
  }

  getWindowCount(): number {
    return this.windowStore.getWindowCount();
  }

  getAllWindowKeys(): string[] {
    return this.windowStore.getAllWindowKeys();
  }

  getAllWindows(): BrowserWindow[] {
    return this.windowStore.getAllWindows();
  }

  getWindowNames(): Map<string, string> {
    return this.windowStore.getWindowNames();
  }

  getNameByWindowId(windowId: string): string | undefined {
    return this.windowStore.getNameByWindowId(windowId);
  }

  getWindowByNameId(name: string): string | undefined {
    return this.windowStore.getWindowByNameId(name);
  }

  getWindowByName(name: string): BrowserWindow | undefined {
    return this.windowStore.getWindowByName(name);
  }

  hasByName(proposedName: string): boolean {
    return this.windowStore.hasByName(proposedName);
  }

  deleteByName(proposedName: string): boolean {
    return this.windowStore.deleteByName(proposedName);
  }

  getWindowById(windowId: string): BrowserWindow | undefined {
    return this.windowStore.getWindowById(windowId);
  }

  hasById(windowId: string): boolean {
    return this.windowStore.hasById(windowId);
  }

  deleteById(windowId: string): boolean {
    return this.windowStore.deleteById(windowId);
  }

  getWindowId(window: BrowserWindow): string | undefined {
    return this.windowStore.getWindowId(window);
  }

  updateWindowName(windowId: string, newName: string): void {
    this.windowStore.updateWindowName(windowId, newName);
  }

  // Helpers

  getTargetWindow(windowId?: string): BrowserWindow | undefined {
    return this.windowStore.getTargetWindow(windowId);
  }

  getValidWindow(windowId?: string): BrowserWindow | undefined {
    return this.windowStore.getValidWindow(windowId);
  }

  getCurrentWindow(): BrowserWindow | undefined {
    return this.windowStore.getCurrentWindow();
  }

  // Context Management

  async saveWindowContext(windowId: string, context: any): Promise<void> {
    await this.windowStore.saveWindowContext(windowId, context);
  }

  async loadWindowContext(windowId: string): Promise<any> {
    return await this.windowStore.loadWindowContext(windowId);
  }

  async clearWindowContext(windowId: string): Promise<void> {
    await this.windowStore.clearWindowContext(windowId);
  }

  // Cleanup

  public startCleanupProtection(intervalMs: number = 30000): void {
    this.windowStore.startCleanupProtection(intervalMs);
  }

  public stopCleanupProtection(): void {
    this.windowStore.stopCleanupProtection();
  }
}
