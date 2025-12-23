/**
 * StateKeeper.ts
 * 窗口状态管理器，负责持久化和恢复 Electron 窗口的位置、大小等状态
 *
 * 主要功能：
 * - 保存窗口状态到文件系统
 * - 从文件系统加载窗口状态
 * - 验证窗口状态的有效性（确保窗口在可用显示器范围内）
 * - 支持延迟保存机制，避免频繁 IO 操作
 */

import { app, screen } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Logger, ILogger } from '@/infrastructure/logger';

/**
 * 窗口状态接口，定义了需要持久化的窗口属性
 */
export interface WindowState {
  x?: number; // 窗口左上角 X 坐标
  y?: number; // 窗口左上角 Y 坐标
  width: number; // 窗口宽度
  height: number; // 窗口高度
  isMaximized: boolean; // 是否最大化
  isFullScreen: boolean; // 是否全屏
  displayBounds?: Electron.Rectangle; // 显示该窗口的显示器边界信息
  groups?: string[]; // 窗口所属的组
}

/**
 * StateKeeper Configuration Options
 * StateKeeper 配置选项
 */
export interface StateKeeperOptions {
  /**
   * Delay before saving state to disk (in milliseconds)
   * 保存状态到磁盘前的延迟时间（毫秒）
   * @default 500
   */
  saveDelay?: number;

  /**
   * Save strategy: 'debounce' or 'throttle'
   * 保存策略：'debounce'（防抖）或 'throttle'（节流）
   * @default 'debounce'
   */
  saveStrategy?: 'debounce' | 'throttle';

  /**
   * Custom logger instance
   * 自定义日志实例
   */
  logger?: ILogger;

  /**
   * Custom state file path
   * 自定义状态文件路径
   */
  stateFilePath?: string;
}

/**
 * 简单的深度对比函数，用于检查窗口状态是否发生变化
 */
function isStateEqual(a: WindowState | undefined, b: WindowState | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  // Check groups equality
  const groupsA = a.groups || [];
  const groupsB = b.groups || [];
  const groupsEqual =
    groupsA.length === groupsB.length &&
    [...groupsA].sort().every((val, index) => val === [...groupsB].sort()[index]);

  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.isMaximized === b.isMaximized &&
    a.isFullScreen === b.isFullScreen &&
    groupsEqual &&
    // 比较 displayBounds
    ((!a.displayBounds && !b.displayBounds) ||
      (!!a.displayBounds &&
        !!b.displayBounds &&
        a.displayBounds.x === b.displayBounds.x &&
        a.displayBounds.y === b.displayBounds.y &&
        a.displayBounds.width === b.displayBounds.width &&
        a.displayBounds.height === b.displayBounds.height))
  );
}

/**
 * 窗口状态管理器类
 * 实现了窗口状态的持久化存储和加载功能
 */
export default class StateKeeper {
  private stateFile: string; // 状态文件路径
  private state: Record<string, WindowState> = {}; // 存储所有窗口的状态
  private logger: ILogger; // 日志记录器

  private saveTimer: NodeJS.Timeout | null = null; // 延迟保存计时器
  private throttleLastSave: number = 0; // 节流模式下上次保存时间
  private readonly saveDelay: number; // 延迟保存时间（毫秒）
  private readonly saveStrategy: 'debounce' | 'throttle'; // 保存策略

  // Track active state files to prevent multiple instances writing to the same file
  // 跟踪活动的 State 文件，防止多个实例写入同一个文件
  private static activeFiles: Set<string> = new Set();
  private hasLock: boolean = false;
  private isWriting: boolean = false;
  private pendingWrite: boolean = false;
  private lastSavedHash: string = '';

  /**
   * 构造函数
   * @param options 配置选项
   */
  constructor(options: StateKeeperOptions = {}) {
    // 初始化日志记录器
    this.logger = options.logger || new Logger({ appName: 'StateKeeper' });

    // 初始化配置
    this.saveDelay = options.saveDelay ?? 500;
    this.saveStrategy = options.saveStrategy ?? 'debounce';

    // 获取应用程序的数据目录
    const userDataDir = app.getPath('userData');
    // 设置状态文件路径
    this.stateFile = options.stateFilePath || path.join(userDataDir, 'window-state.json');

    // Check if file is already being used by another instance
    // 检查文件是否已被另一个实例使用
    if (StateKeeper.activeFiles.has(this.stateFile)) {
      this.logger.warn(
        `State file "${this.stateFile}" is already in use by another StateKeeper instance. This may lead to data conflicts.`
      );
      this.hasLock = false;
    } else {
      StateKeeper.activeFiles.add(this.stateFile);
      this.hasLock = true;
    }

    // 加载已保存的窗口状态
    this.loadState();

    // 监听 app 退出事件，强制保存
    app.on('before-quit', () => {
      this.flushSync();
    });
  }

  /**
   * 从文件加载窗口状态
   * 私有方法，仅在构造函数中调用
   */
  private loadState(): void {
    try {
      // 检查状态文件是否存在
      if (fs.existsSync(this.stateFile)) {
        // 读取文件内容
        const data = fs.readFileSync(this.stateFile, 'utf-8');
        // 解析 JSON 数据到状态对象
        this.state = JSON.parse(data);
        // Calculate initial hash
        this.lastSavedHash = crypto.createHash('md5').update(data).digest('hex');
      }
    } catch (error) {
      // 加载失败时记录错误并初始化空状态
      this.logger.error(`Failed to load window state: ${error}`);
      this.state = {};
    }
  }

  /**
   * 保存指定窗口的状态
   * @param windowName 窗口名称，用于标识不同窗口的状态
   * @param windowState 窗口状态对象
   */
  public saveState(windowName: string, windowState: WindowState): void {
    // 1. Dirty Check (脏检查)
    // 如果新状态与当前保存的状态一致，则跳过保存
    const currentState = this.state[windowName];
    if (isStateEqual(currentState, windowState)) {
      return;
    }

    // 更新内存中的窗口状态
    this.state[windowName] = windowState;
    // 触发持久化操作（带延迟）
    this.persist();
  }

  /**
   * 立即同步保存状态（不使用延迟）
   */
  public flushSync(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logger.error(`Failed to flush window state: ${error}`);
    }
  }

  /**
   * 将内存中的状态持久化到文件
   * 私有方法，使用延迟保存机制避免频繁 IO 操作
   */
  private persist(): void {
    if (this.saveStrategy === 'throttle') {
      // 节流模式：在指定时间内只保存一次
      const now = Date.now();
      const timeSinceLastSave = now - this.throttleLastSave;

      if (timeSinceLastSave >= this.saveDelay) {
        // 立即保存
        this.performSave();
        this.throttleLastSave = now;
      } else {
        // 安排在剩余时间后保存
        if (this.saveTimer) {
          clearTimeout(this.saveTimer);
        }
        this.saveTimer = setTimeout(() => {
          this.performSave();
          this.throttleLastSave = Date.now();
        }, this.saveDelay - timeSinceLastSave);
      }
    } else {
      // 防抖模式（默认）：重置计时器
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
      }

      this.saveTimer = setTimeout(() => {
        this.performSave();
      }, this.saveDelay);
    }
  }

  /**
   * 执行实际的保存操作
   * 私有方法
   */
  private async performSave(): Promise<void> {
    // If already writing, mark pending and return
    // 如果正在写入，标记为等待写入并返回
    if (this.isWriting) {
      this.pendingWrite = true;
      return;
    }

    this.isWriting = true;
    const tempFile = `${this.stateFile}.tmp`; // 临时文件路径

    try {
      const data = JSON.stringify(this.state, null, 2);

      // Optimization: Check if data has actually changed using MD5 hash
      // 优化：使用 MD5 哈希检查数据是否实际发生变化
      const currentHash = crypto.createHash('md5').update(data).digest('hex');
      if (currentHash === this.lastSavedHash) {
        // No changes, skip write
        this.isWriting = false;
        return;
      }

      // 1. Write to temporary file first (Atomic Write Step 1)
      // 先写入临时文件（原子写入步骤 1）
      await fs.promises.writeFile(tempFile, data);

      // 2. Rename temporary file to actual file (Atomic Write Step 2)
      // 重命名临时文件为实际文件（原子写入步骤 2）
      // This operation is atomic on most file systems
      // 此操作在大多数文件系统上是原子的
      await fs.promises.rename(tempFile, this.stateFile);

      this.lastSavedHash = currentHash;
    } catch (error) {
      this.logger.error(`Failed to save window state: ${error}`);

      // Cleanup: Try to delete the temp file if it exists
      // 清理：如果临时文件存在，尝试删除
      try {
        await fs.promises.unlink(tempFile);
      } catch (cleanupError) {
        // Ignore cleanup errors (e.g. file not found)
        // 忽略清理错误（例如文件未找到）
      }
    } finally {
      this.saveTimer = null;
      this.isWriting = false;

      // If a write was requested while writing, trigger another save immediately
      // 如果在写入期间请求了写入，立即触发另一次保存
      if (this.pendingWrite) {
        this.pendingWrite = false;
        // Use setImmediate to break the call stack and allow other events
        // 使用 setImmediate 打断调用栈并允许处理其他事件
        setImmediate(() => this.performSave());
      }
    }
  }

  /**
   * 获取指定窗口的状态
   * @param windowName 窗口名称
   * @param defaultWidth 默认宽度，当没有保存状态或状态无效时使用
   * @param defaultHeight 默认高度，当没有保存状态或状态无效时使用
   * @returns 窗口状态对象
   */
  public getWindowState(
    windowName: string,
    defaultWidth: number = 800,
    defaultHeight: number = 600
  ): WindowState {
    // 获取保存的窗口状态
    const savedState = this.state[windowName];
    // 如果没有保存的状态，返回默认状态
    if (!savedState) {
      return {
        width: defaultWidth,
        height: defaultHeight,
        isMaximized: false,
        isFullScreen: false,
      };
    }

    // 验证保存的状态是否有效
    if (!this.isValidState(savedState)) {
      // 如果状态无效，返回默认状态
      return {
        width: defaultWidth,
        height: defaultHeight,
        isMaximized: false,
        isFullScreen: false,
      };
    }

    // 返回有效的保存状态
    return savedState;
  }

  /**
   * 验证窗口状态是否有效
   * 主要检查窗口是否在当前可用显示器范围内
   * @param state 要验证的窗口状态
   * @returns 状态是否有效
   */
  private isValidState(state: WindowState): boolean {
    // 获取所有可用显示器
    const displays = screen.getAllDisplays();

    // 优先检查保存的显示器信息是否与当前显示器匹配
    if (state.displayBounds) {
      const displayMatch = displays.find((d) => {
        // 精确匹配显示器边界
        return (
          d.bounds.x === state.displayBounds?.x &&
          d.bounds.y === state.displayBounds?.y &&
          d.bounds.width === state.displayBounds?.width &&
          d.bounds.height === state.displayBounds?.height
        );
      });

      if (displayMatch) {
        // 如果找到完全匹配的显示器，并且窗口有坐标信息，则认为状态有效
        if (state.x !== undefined && state.y !== undefined) {
          return true;
        }
      }
    }

    // 降级验证：检查窗口是否与任何显示器相交
    const isVisible = displays.some((display) => {
      const { x, y, width, height } = display.bounds;
      // 如果窗口没有坐标信息，使用默认值 0
      const wx = state.x || 0;
      const wy = state.y || 0;
      const ww = state.width;
      const wh = state.height;

      // 简单的矩形相交检查
      return wx < x + width && wx + ww > x && wy < y + height && wy + wh > y;
    });

    return isVisible;
  }

  /**
   * 移除指定窗口的状态
   * @param windowName 窗口名称
   */
  public removeState(windowName: string): void {
    // 检查是否存在该窗口的状态
    if (this.state[windowName]) {
      // 从内存中删除窗口状态
      delete this.state[windowName];
      // 触发持久化操作
      this.persist();
    }
  }

  /**
   * Dispose StateKeeper instance
   * 释放 StateKeeper 实例
   */
  public dispose(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    // Only remove from activeFiles if this instance acquired the lock
    if (this.hasLock) {
      StateKeeper.activeFiles.delete(this.stateFile);
    }
  }
}
