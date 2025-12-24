import { Logger, ILogger } from '@/infrastructure/logger';
import type { WindowManagerApi, WindowCreationOptions } from './window-manager.type';

/**
 * WindowCreator - Universal window creation helper class
 * WindowCreator - 通用窗口创建辅助类
 *
 * Handles window creation, restoration, display, and exception recovery.
 * 用于处理窗口创建、恢复、显示以及异常恢复逻辑。
 */
export default class WindowCreator<T = WindowCreationOptions> {
  private api: WindowManagerApi;
  private data: {
    data: T & { winId?: string };
    contentLoader?: (window: any, options: any) => Promise<void> | void;
  };
  private winId: string;
  private creator: (options: WindowCreationOptions) => string | Promise<string>;
  private extraOptions?: (data: T) => object;
  private logger: ILogger;

  /**
   * Constructor
   * 构造函数
   *
   * @param api - WindowManager API interface (WindowManager API 接口)
   * @param data - Data object passed to the window, including winId (传递给窗口的数据对象，包含 winId)
   * @param creator - Window creation function (窗口创建函数)
   * @param extraOptions - Optional function to generate extra configuration (可选的额外配置生成函数)
   * @param logger - Optional logger instance (可选的日志实例)
   */
  constructor(
    api: WindowManagerApi,
    data: {
      data: T & { winId?: string };
      contentLoader?: (window: any, options: any) => Promise<void> | void;
    },
    creator: (options: WindowCreationOptions) => string | Promise<string>,
    extraOptions?: (data: T) => object,
    logger?: ILogger
  ) {
    this.api = api;
    this.data = data;
    this.winId = data?.data?.winId || '';
    this.creator = creator;
    this.extraOptions = extraOptions;
    this.logger = logger || new Logger({ appName: 'WindowCreator' });
  }

  /**
   * Internal method: Create window
   * 内部方法：创建窗口
   *
   * Checks if window exists. If it exists but is destroyed, cleans up and recreates.
   * 检查窗口是否存在。如果存在但已销毁，则清理并重新创建。
   *
   * @returns Object containing window ID and isNew flag (包含窗口 ID 和是否为新创建标志的对象)
   */
  private async createWindow(): Promise<{ winId: string; isNew: boolean }> {
    let isNew = false;

    // Check if window exists
    // 检查窗口是否存在
    if (this.winId && this.api.window.hasById(this.winId)) {
      // If exists but destroyed, clean it up
      // 如果存在但已销毁，进行清理
      if (this.api.window.isDestroyed(this.winId)) {
        this.logger.warn(
          `Window ${this.winId} is found in store but destroyed. Cleaning up and recreating.`
        );
        // Clean up using the API which should handle both ID and Name maps if possible
        // 使用 API 清理，应该同时处理 ID 和名称映射
        await this.api.window.removeWindow(this.winId);
      } else {
        // Window exists and is valid
        // 窗口存在且有效
        return { winId: this.winId, isNew: false };
      }
    }

    // Create new window instance
    // 创建新窗口实例
    const base = this.data.data || ({} as any);
    const options = {
      ...(base as any),
      ...(this.extraOptions?.(base) || {}),
      ...(this.winId ? { windowId: this.winId } : {}),
    };

    this.winId = await this.creator(options);
    isNew = true;

    return { winId: this.winId, isNew };
  }

  /**
   * Internal method: Show window
   * 内部方法：显示窗口
   *
   * @param winId - Window ID (窗口 ID)
   * @param isNew - Is newly created (是否为新创建)
   */
  private showWindow(winId: string, isNew: boolean): void {
    const win = this.api.window.getTargetWindow(winId);

    if (!win || win.isDestroyed()) {
      this.logger.error(`Failed to show window ${winId}: Window not found or destroyed`);
      return;
    }

    if (isNew) {
      // For new windows, wait for ready-to-show to prevent flickering
      // 对于新窗口，等待 ready-to-show 事件以防止闪烁
      win.once('ready-to-show', () => {
        this.api.window.show(win, winId);
      });
    } else {
      // For existing windows, show immediately
      // 对于现有窗口，立即显示
      this.api.window.show(win, winId);
    }
  }

  /**
   * Internal method: Load content
   * 内部方法：加载内容
   */
  private async loadContent(winId: string, options: WindowCreationOptions): Promise<void> {
    const win = this.api.window.getTargetWindow(winId);
    if (!win || win.isDestroyed()) return;

    // Handle custom load handler
    // 处理自定义加载处理程序
    if (options.loadWindowContent) {
      try {
        await options.loadWindowContent(win);
      } catch (e) {
        this.logger.error(`Custom loadWindowContent failed for window ${winId}: ${e}`);
      }
      return;
    }

    if (this.data.contentLoader) {
      try {
        await this.data.contentLoader(win, options);
      } catch (e) {
        this.logger.error(`Global contentLoader failed for window ${winId}: ${e}`);
      }
      return;
    }

    if (options.loadUrl) {
      win.loadURL(options.loadUrl).catch((e) => {
        this.logger.error(`Failed to load URL "${options.loadUrl}" for window ${winId}: ${e}`);
      });
    } else if (options.loadFile) {
      win.loadFile(options.loadFile).catch((e) => {
        this.logger.error(`Failed to load file "${options.loadFile}" for window ${winId}: ${e}`);
      });
    }
  }

  /**
   * Create and show window
   * 创建并显示窗口
   *
   * If window exists, restores and focuses it. If not, creates it.
   * 如果窗口已存在则恢复并聚焦，如果不存在则创建。
   *
   * @returns Window ID (窗口 ID)
   */
  public async createAndShow(): Promise<string> {
    try {
      const { isNew } = await this.createWindow();

      // Load content if it's a new window
      if (isNew) {
        const base = this.data.data || ({} as any);
        const options = {
          ...(base as any),
          ...(this.extraOptions?.(base) || {}),
          windowId: this.winId,
        };
        await this.loadContent(this.winId, options);
      }

      this.showWindow(this.winId, isNew);
      return this.winId;
    } catch (error) {
      this.logger.error(`Failed to create and show window: ${error}`);
      throw error;
    }
  }
}
