import { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import type WindowManager from './WindowManager';

// Type-only imports - no runtime dependency
// 仅类型导入 - 无运行时依赖
// These imports are erased during compilation and don't create runtime dependencies
// 这些导入在编译时被擦除，不会创建运行时依赖
import type { ILogger } from '@/infrastructure/logger';
import type StateKeeper from '@/internal/utils/StateKeeper';
import type { IIpcTransport } from '@/core/ipc/transport/ipc.type';
import type IpcRouter from '@/core/ipc/IpcRouter';
import type { MessageBus } from '@/core/message-bus/MessageBus';

/**
 * WindowManager Plugin Interface
 * WindowManager 插件接口
 */
export interface WindowManagerPlugin {
  /**
   * Plugin name
   * 插件名称
   */
  name: string;
  /**
   * Called when plugin is initialized
   * 插件初始化时调用
   */
  onInit?(windowManager: WindowManager): void | Promise<void>;
  /**
   * Called before window creation. Return false to cancel creation.
   * 窗口创建前调用。返回 false 取消创建。
   * Note: Must be synchronous to keep create() synchronous.
   * 注意：必须是同步的，以保持 create() 同步。
   */
  onWillCreate?(config: WindowCreationOptions): WindowCreationOptions | void | false;
  /**
   * Called after window creation
   * 窗口创建后调用
   */
  onDidCreate?(details: { window: BrowserWindow; id: string; name?: string }): void | Promise<void>;
  /**
   * Called before window destruction
   * 窗口销毁前调用
   */
  onWillDestroy?(windowId: string): void | Promise<void>;
  /**
   * Called after window destruction
   * 窗口销毁后调用
   */
  onDidDestroy?(windowId: string): void | Promise<void>;
}

/**
 * Lifecycle Hooks Interface
 * 生命周期钩子接口
 */
export interface LifecycleHooks {
  onWillCreate?: (config: WindowCreationOptions) => WindowCreationOptions | void | false;
  onDidCreate?: (details: {
    window: BrowserWindow;
    id: string;
    name?: string;
  }) => void | Promise<void>;
  onWillDestroy?: (windowId: string) => void | Promise<void>;
  onDidDestroy?: (windowId: string) => void | Promise<void>;
}

/**
 * Context Persistence Interface
 * 上下文持久化接口
 */
export interface IContextPersistence {
  save(windowId: string, context: any): Promise<void>;
  load(windowId: string): Promise<any>;
  clear(windowId: string): Promise<void>;
}

/**
 * Window Store Options Interface
 * 窗口存储配置接口
 */
export interface WindowStoreOptions {
  /**
   * Logger instance
   * 日志实例
   */
  logger?: ILogger;
  /**
   * State Keeper instance
   * 状态保持器实例
   */
  stateKeeper?: StateKeeper;
  /**
   * Context Persistence Strategy
   * 上下文持久化策略
   */
  contextPersistence?: IContextPersistence;
  /**
   * Maximum number of windows allowed
   * 允许的最大窗口数量
   */
  maxWindows?: number;
  /**
   * Interval for cleaning up destroyed windows (in ms)
   * 清理已销毁窗口的间隔（毫秒）
   */
  cleanupInterval?: number;
  /**
   * Whether to enable window state persistence
   * 是否启用窗口状态持久化
   */
  enablePersistence?: boolean;
  /**
   * Whether to automatically start cleanup protection (default: true)
   * 是否自动启动清理保护（默认：true）
   */
  autoStartCleanup?: boolean;
}

/**
 * Custom Window Creation Options
 * 自定义窗口创建选项
 */
export interface WindowCreationOptions extends BrowserWindowConstructorOptions {
  /**
   * Unique window identifier
   * 唯一窗口标识符
   */
  windowId?: string;
  /**
   * Window semantic name
   * 窗口语义化名称
   */
  name?: string;
  /**
   * Whether to open DevTools in development
   * 是否在开发模式下打开开发者工具
   */
  isDevelopment?: boolean;
  /**
   * Default configuration to inherit from
   * 要继承的默认配置
   */
  defaultConfig?: BrowserWindowConstructorOptions;
  /**
   * URL to load immediately after window creation
   * 窗口创建后立即加载的 URL
   */
  loadUrl?: string;
  /**
   * Local file path to load immediately after window creation
   * 窗口创建后立即加载的本地文件路径
   */
  loadFile?: string;
  /**
   * Custom content loading handler
   * 自定义内容加载处理程序
   * If provided, loadUrl and loadFile will be ignored by default handler.
   * 如果提供，loadUrl 和 loadFile 将被默认处理程序忽略。
   */
  loadWindowContent?: (window: BrowserWindow) => Promise<void> | void;
  /**
   * Additional custom properties
   * 其他自定义属性
   */
  [key: string]: any;
  /**
   * Whether to enable state persistence for this window
   * 是否为此窗口启用状态持久化
   */
  enablePersistence?: boolean;
}

/**
 * WindowManager Events Interface
 * WindowManager 事件接口
 */
export interface WindowManagerEvents {
  /**
   * Emitted when an error occurs
   * 当发生错误时触发
   */
  error: (error: Error) => void;
  /**
   * Emitted after a window is created
   * 窗口创建后触发
   */
  'window-created': (details: { window: BrowserWindow; id: string; name: string }) => void;
  /**
   * Emitted after a window is destroyed
   * 窗口销毁后触发
   */
  'window-destroyed': (id: string) => void;
  /**
   * Emitted before a window is destroyed
   * 窗口销毁前触发
   */
  'window-will-be-destroyed': (id: string) => void;
}

/**
 * Window Manager API Interface (for internal use)
 * 窗口管理器 API 接口（内部使用）
 */
export interface WindowManagerApi {
  /**
   * Window operations namespace
   * 窗口操作命名空间
   */
  window: {
    /**
     * Check if window exists by ID
     * 检查指定 ID 的窗口是否存在
     */
    hasById(id: string): boolean;
    /**
     * Check if window is destroyed
     * 检查窗口是否已销毁
     */
    isDestroyed(id: string): boolean;
    /**
     * Delete window by name
     * 根据名称删除窗口
     */
    deleteByName(name: string): boolean;
    /**
     * Delete window by ID
     * 根据 ID 删除窗口
     */
    deleteById(id: string): boolean;
    /**
     * Get target window by ID
     * 获取目标窗口
     */
    getTargetWindow(id: string): BrowserWindow | undefined;
    /**
     * Remove window
     * 移除窗口
     */
    removeWindow(id: string): void | Promise<void>;
    /**
     * Show window
     * 显示窗口
     */
    show(window: BrowserWindow, id: string): void;
  };
}

/**
 * Window Manager Configuration Interface
 * 窗口管理器配置接口
 *
 * Note: Uses 'any' for external dependencies to keep the module independent
 * 注意：对外部依赖使用 'any' 类型以保持模块独立性
 */
export interface WindowManagerConfig {
  /**
   * Default browser window options
   * 默认浏览器窗口选项
   */
  defaultConfig?: BrowserWindowConstructorOptions;
  /**
   * Development mode flag
   * 开发模式标志
   */
  isDevelopment?: boolean;
  /**
   * Linux platform flag
   * Linux 平台标志
   */
  isLinux?: boolean;
  /**
   * Logger instance
   * 日志实例
   */
  logger?: ILogger;
  /**
   * IpcRouter instance for dependency injection
   * 用于依赖注入的 IpcRouter 实例
   */
  ipcRouter?: IpcRouter;
  /**
   * IpcTransport instance
   * IpcTransport 实例
   */
  ipcTransport?: IIpcTransport;
  /**
   * MessageBus instance for dependency injection
   * 用于依赖注入的 MessageBus 实例
   */
  messageBus?: MessageBus;
  /**
   * IPC configuration
   * IPC 配置
   */
  ipc?: {
    /**
     * Whether to automatically initialize IPC on instantiation, default is true
     * 是否在实例化时自动初始化 IPC，默认为 true
     */
    autoInit?: boolean;
    /**
     * Async communication channel name, default is 'renderer-to-main'
     * 异步通信频道名称，默认为 'renderer-to-main'
     */
    channel?: string;
    /**
     * Sync communication channel name, default is 'renderer-to-main-sync'
     * 同步通信频道名称，默认为 'renderer-to-main-sync'
     */
    syncChannel?: string;
  };
  /**
   * Optional custom IPC setup function
   * 可选的自定义 IPC 设置函数
   */
  ipcSetup?: (
    windowManager: WindowManager,
    options?: { channel?: string; syncChannel?: string }
  ) => { channel: string; syncChannel: string; ipcTransport?: IIpcTransport };
  /**
   * Whether to prevent external links from opening in the window (default: true)
   * 是否阻止在窗口中打开外部链接（默认：true）
   */
  preventExternalLinks?: boolean;
  /**
   * Plugins list
   * 插件列表
   */
  plugins?: WindowManagerPlugin[];
  /**
   * Lifecycle hooks
   * 生命周期钩子
   */
  hooks?: LifecycleHooks;
  /**
   * WindowStore configuration (nested)
   * WindowStore 配置（嵌套）
   */
  store?: WindowStoreOptions;
  /**
   * Global custom content loader
   * 全局自定义内容加载器
   * Fallback for when no specific loadWindowContent is provided in window options
   * 当窗口选项中未提供特定 loadWindowContent 时的后备
   */
  contentLoader?: (window: BrowserWindow, options: WindowCreationOptions) => Promise<void> | void;
}

/**
 * Frame Interface
 * 窗口框架接口
 */
export interface Frame {
  /**
   * Create window
   * 创建窗口
   */
  create(config?: WindowCreationOptions): string;
}

/**
 * Frame Constructor Interface
 * 窗口框架构造函数接口
 */
export interface FrameConstructor {
  new (): Frame;
}
