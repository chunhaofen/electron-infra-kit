import { ILogger, getSharedLogger } from '@/infrastructure/logger';
import WindowManager from '@/core/window/WindowManager';
import IpcRouter from '@/core/ipc/IpcRouter';
import { MessageBus } from '@/core/message-bus/MessageBus';
import { WindowManagerConfig } from '@/core/window/window-manager.type';
import { DebugHelper } from '@/infrastructure/debug';

/**
 * Lifecycle Configuration
 * 生命周期配置
 */
export interface LifecycleConfig extends WindowManagerConfig {
  /**
   * Whether to automatically start on instantiation (default: false)
   * 是否在实例化时自动启动 (默认: false)
   */
  autoStart?: boolean;

  /**
   * Existing IpcRouter instance
   * 现有的 IpcRouter 实例
   */
  ipcRouter?: IpcRouter;

  /**
   * Existing WindowManager instance
   * 现有的 WindowManager 实例
   */
  windowManager?: WindowManager;

  /**
   * Existing MessageBus instance
   * 现有的 MessageBus 实例
   */
  messageBus?: MessageBus;
}

/**
 * Lifecycle Manager
 * 生命周期管理器
 *
 * Orchestrates the startup and shutdown of the Electron Toolkit modules.
 * 编排 Electron Toolkit 模块的启动和关闭。
 */
export class LifecycleManager {
  public windowManager?: WindowManager;
  public ipcRouter?: IpcRouter;
  public messageBus?: MessageBus;
  private logger: ILogger;
  private isStarted = false;
  private config: LifecycleConfig;

  /**
   * Create LifecycleManager instance
   * 创建 LifecycleManager 实例
   * @param config - Configuration object
   */
  constructor(config: LifecycleConfig = {}) {
    this.config = config;
    const logger = config.logger || getSharedLogger(config.loggerOptions);
    this.logger = logger;

    if (config.autoStart) {
      this.startup().catch((err) => {
        this.logger.error(`Auto-startup failed: ${err}`);
      });
    }
  }

  /**
   * Start up all services
   * 启动所有服务
   */
  async startup(): Promise<void> {
    if (this.isStarted) {
      this.logger.warn('LifecycleManager already started');
      return;
    }

    try {
      this.logger.info('Starting up Electron Toolkit services...');

      // 1. Initialize IpcRouter (Foundation for communication)
      // 1. 初始化 IpcRouter (通信基础)
      this.ipcRouter = this.config.ipcRouter || new IpcRouter({ logger: this.logger });
      this.logger.info('IpcRouter initialized');

      // 2. Initialize MessageBus (Cross-window communication)
      // 2. 初始化 MessageBus (跨窗口通信)
      this.messageBus = this.config.messageBus || new MessageBus({ logger: this.logger });

      // 3. Initialize WindowManager (Core window management)
      // 3. 初始化 WindowManager (核心窗口管理)
      this.windowManager =
        this.config.windowManager ||
        new WindowManager({
          ...this.config,
          logger: this.logger,
          ipcRouter: this.ipcRouter,
          messageBus: this.messageBus,
        });
      // Wait for WindowManager initialization (plugins, etc.)
      await this.windowManager.ready();
      this.logger.info('WindowManager initialized');

      // 4. Connect MessageBus to WindowManager
      // 4. 连接 MessageBus 到 WindowManager
      this.messageBus.autoRegisterWindows(this.windowManager);
      this.logger.info('MessageBus initialized');

      // 4. Setup Debug Mode if enabled
      // 4. 如果启用，设置调试模式
      if (this.config.isDevelopment || process.env.NODE_ENV === 'development') {
        DebugHelper.enableDebugMode();
        DebugHelper.register('windowManager', this.windowManager);
        DebugHelper.register('ipcRouter', this.ipcRouter);
        DebugHelper.register('messageBus', this.messageBus);
        DebugHelper.register('lifecycleManager', this);
        this.logger.info('Debug mode enabled');
      }

      this.isStarted = true;
      this.logger.info('Startup completed successfully');
    } catch (error) {
      this.logger.error(`Startup failed: ${error}`);
      await this.shutdown(); // Cleanup partial initialization
      throw error;
    }
  }

  /**
   * Shut down all services gracefully
   * 优雅地关闭所有服务
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Electron Toolkit services...');

    // Shutdown in reverse order of initialization
    // 按初始化的逆序关闭

    // 1. Dispose MessageBus
    if (this.messageBus) {
      try {
        this.messageBus.dispose();
        this.logger.info('MessageBus disposed');
      } catch (e) {
        this.logger.warn(`MessageBus dispose error: ${e}`);
      }
      this.messageBus = undefined;
    }

    // 2. Dispose WindowManager (closes all windows)
    if (this.windowManager) {
      try {
        if (typeof this.windowManager.dispose === 'function') {
          await this.windowManager.dispose();
          this.logger.info('WindowManager disposed');
        } else {
          // Fallback if dispose is not implemented
          this.windowManager.stopCleanupProtection();
          // Ideally we should close all windows here, but we rely on WindowManager's dispose
        }
      } catch (e) {
        this.logger.warn(`WindowManager dispose error: ${e}`);
      }
      this.windowManager = undefined;
    }

    // 3. Dispose IpcRouter
    if (this.ipcRouter) {
      try {
        this.ipcRouter.dispose();
        this.logger.info('IpcRouter disposed');
      } catch (e) {
        this.logger.warn(`IpcRouter dispose error: ${e}`);
      }
      this.ipcRouter = undefined;
    }

    this.isStarted = false;
    this.logger.info('Shutdown completed');
  }

  /**
   * Get initialization status
   * 获取初始化状态
   */
  public get started(): boolean {
    return this.isStarted;
  }
}
