import { BrowserWindow } from 'electron';
import { ILogger } from '@/infrastructure/logger';

/**
 * WindowOperator - Encapsulates window operations
 * 窗口操作员 - 封装窗口操作
 */
export class WindowOperator {
  constructor(private logger: ILogger) {}

  /**
   * Check if window is safe to operate on
   * 检查窗口是否可以安全操作
   */
  isSafe(window?: BrowserWindow | null): window is BrowserWindow {
    return !!window && !window.isDestroyed();
  }

  /**
   * Show window
   * 显示窗口
   */
  show(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.show();
    window.setSkipTaskbar(false);
  }

  /**
   * Hide window
   * 隐藏窗口
   */
  hide(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.hide();
    window.setSkipTaskbar(true);
  }

  /**
   * Minimize window
   * 最小化窗口
   */
  minimize(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.minimize();
  }

  /**
   * Restore window
   * 恢复窗口
   */
  restore(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.restore();
  }

  /**
   * Maximize window
   * 最大化窗口
   */
  maximize(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.maximize();
  }

  /**
   * Unmaximize window
   * 取消最大化窗口
   */
  unmaximize(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.unmaximize();
  }

  /**
   * Toggle full screen
   * 切换全屏
   */
  toggleFullScreen(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.setFullScreen(!window.isFullScreen());
  }

  /**
   * Focus window
   * 聚焦窗口
   */
  focus(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.focus();
  }

  /**
   * Close window
   * 关闭窗口
   */
  close(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.close();
  }

  /**
   * Destroy window (Force close)
   * 销毁窗口（强制关闭）
   */
  destroy(window?: BrowserWindow | null): void {
    if (!this.isSafe(window)) return;
    window.destroy();
  }

  /**
   * Open DevTools
   * 打开开发者工具
   */
  openDevTools(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.webContents.openDevTools();
  }

  /**
   * Close DevTools
   * 关闭开发者工具
   */
  closeDevTools(window: BrowserWindow): void {
    if (!this.isSafe(window)) return;
    window.webContents.closeDevTools();
  }

  /**
   * Check if DevTools is opened
   * 检查开发者工具是否已打开
   */
  isDevToolsOpened(window: BrowserWindow): boolean {
    if (!this.isSafe(window)) return false;
    return window.webContents.isDevToolsOpened();
  }

  /**
   * Send message to window
   * 发送消息给窗口
   */
  send(window: BrowserWindow, channel: string, data: unknown): void {
    if (!this.isSafe(window)) return;
    window.webContents.send(channel, data);
  }

  /**
   * Set skip taskbar
   * 设置是否在任务栏隐藏
   */
  setSkipTaskbar(window: BrowserWindow, skip: boolean): void {
    if (!this.isSafe(window)) return;
    window.setSkipTaskbar(skip);
  }
}
