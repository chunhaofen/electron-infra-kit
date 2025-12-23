import { BrowserWindow, screen } from 'electron';
import { ILogger } from '@/infrastructure/logger';
import StateKeeper from '@/internal/utils/StateKeeper';

/**
 * WindowStateManager - Manages window state persistence
 * 窗口状态管理器 - 管理窗口状态持久化
 */
export class WindowStateManager {
  private stateKeeper: StateKeeper;

  private handlers = new Map<number, () => void>();

  constructor(
    private logger: ILogger,
    stateKeeper?: StateKeeper
  ) {
    this.stateKeeper = stateKeeper || new StateKeeper({ logger: this.logger });
  }

  /**
   * Register window state persistence listeners
   * 注册窗口状态持久化监听器
   * @param name - Window name (窗口名称)
   * @param window - BrowserWindow instance (BrowserWindow 实例)
   * @param getGroups - Optional callback to get current groups (可选回调获取当前组)
   */
  manage(name: string, window: BrowserWindow, getGroups?: () => string[]): void {
    // Prevent duplicate management
    this.unmanage(window.id);

    const saveState = () => {
      if (window.isDestroyed()) return;

      try {
        const bounds = window.getBounds();
        const isMaximized = window.isMaximized();
        const isFullScreen = window.isFullScreen();
        const display = screen.getDisplayMatching(bounds);
        const groups = getGroups ? getGroups() : undefined;

        this.stateKeeper.saveState(name, {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized,
          isFullScreen,
          displayBounds: display.bounds,
          groups,
        });
      } catch (error) {
        this.logger.warn(`Failed to save state for window ${name}: ${error}`);
      }
    };

    // Remove double debounce: StateKeeper already handles debounce/throttle
    // 移除双重防抖：StateKeeper 已经处理了防抖/节流
    window.on('resize', saveState);
    window.on('move', saveState);
    window.on('close', saveState);
    window.on('maximize', saveState);
    window.on('unmaximize', saveState);
    window.on('enter-full-screen', saveState);
    window.on('leave-full-screen', saveState);

    // Register cleanup handler
    const cleaner = () => {
      if (!window.isDestroyed()) {
        window.removeListener('resize', saveState);
        window.removeListener('move', saveState);
        window.removeListener('close', saveState);
        window.removeListener('maximize', saveState);
        window.removeListener('unmaximize', saveState);
        window.removeListener('enter-full-screen', saveState);
        window.removeListener('leave-full-screen', saveState);
      }
    };
    this.handlers.set(window.id, cleaner);

    // Auto cleanup on close
    // 注意：'closed' 事件触发时窗口已被销毁，无法 removeListener，但我们需要从 map 中移除 cleaner
    window.once('closed', () => {
      this.handlers.delete(window.id);
    });
  }

  /**
   * Stop managing window state
   * 停止管理窗口状态
   */
  unmanage(windowId: number): void {
    const cleaner = this.handlers.get(windowId);
    if (cleaner) {
      cleaner();
      this.handlers.delete(windowId);
    }
  }

  /**
   * Dispose manager and release resources
   * 释放管理器及资源
   */
  public dispose(): void {
    // Cleanup all handlers
    this.handlers.forEach((cleaner) => cleaner());
    this.handlers.clear();

    // Dispose state keeper
    if (this.stateKeeper && typeof this.stateKeeper.dispose === 'function') {
      this.stateKeeper.dispose();
    }
  }
  /**
   * Get saved window state
   * 获取保存的窗口状态
   * @param name - Window name (窗口名称)
   * @param defaultWidth - Default width (默认宽度)
   * @param defaultHeight - Default height (默认高度)
   * @returns Saved state or default state (保存的状态或默认状态)
   */
  getState(name: string, defaultWidth?: number, defaultHeight?: number) {
    return this.stateKeeper.getWindowState(name, defaultWidth, defaultHeight);
  }
}
