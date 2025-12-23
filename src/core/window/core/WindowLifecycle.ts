import { BrowserWindow, app } from 'electron';
import { PerformanceMonitor } from '@/infrastructure/debug';
import WindowCreator from '../WindowCreator';
import type WindowManager from '../WindowManager';
import { WindowManagerApi, WindowCreationOptions } from '../window-manager.type';
import { PluginExecutor } from './PluginExecutor';
import { MetricsManager } from './MetricsManager';
import { ILogger } from '@/infrastructure/logger';

const IS_DEV = !app.isPackaged;

export class WindowLifecycle {
  constructor(
    private wm: WindowManager,
    private pluginExecutor: PluginExecutor,
    private metrics: MetricsManager,
    private logger: ILogger
  ) {}

  public async create(config: WindowCreationOptions = {}): Promise<string> {
    const startTime = Date.now();
    const perf = PerformanceMonitor.getInstance();
    const measureId = `create-window-${Date.now()}`;
    perf.startMeasure(measureId, 'Window Creation', { name: config.name });

    // Run onWillCreate hooks via PluginExecutor
    const hookResult = this.pluginExecutor.onWillCreate(config);
    if (hookResult === false) return '';
    config = hookResult;

    // Initialize config from creation parameters
    if (config.defaultConfig) {
      this.wm.config.defaultConfig = config.defaultConfig;
    }

    // Use module-level constant IS_DEV to lock environment state
    this.wm.config.isDevelopment = config.isDevelopment ?? IS_DEV;

    this.logger.info(
      `Current Environment / 当前环境: ${JSON.stringify(
        {
          appIsPackaged: app.isPackaged,
          cachedIsDev: IS_DEV,
          finalConfigIsDev: this.wm.config.isDevelopment,
        },
        null,
        2
      )}`
    );

    // Prepare API for WindowCreator
    const api: WindowManagerApi = {
      window: {
        hasById: (id: string) => this.wm.windowStore.hasById(id),
        isDestroyed: (id: string) => this.wm.windowStore.isDestroyed(id),
        deleteByName: (name: string) => {
          const id = this.wm.windowStore.getWindowByNameId(name);
          if (id) {
            this.removeWindow(id); // Call this.removeWindow to trigger hooks
            return true;
          }
          return false;
        },
        deleteById: (id: string) => {
          if (this.wm.windowStore.hasById(id)) {
            this.removeWindow(id); // Call this.removeWindow to trigger hooks
            return true;
          }
          return false;
        },
        getTargetWindow: (id: string) => this.wm.windowStore.getTargetWindow(id),
        removeWindow: (id: string) => this.removeWindow(id), // Call this.removeWindow to trigger hooks
        show: (window: BrowserWindow, id: string) => this.wm.windowStore.show(window, id),
      },
    };

    // Resolve window ID if name is provided
    const resolvedWindowId =
      config.windowId ||
      (config.name ? this.wm.windowStore.getWindowByNameId(config.name) : undefined);

    if (config.windowId) {
      this.wm.validateWindowId(config.windowId, 'create');
    }

    // Handle state persistence restoration
    let finalConfig = { ...config };
    const shouldPersist = config.enablePersistence ?? this.wm.windowStore.persistenceEnabled;

    if (shouldPersist && config.name) {
      const savedState = this.wm.windowStore.getWindowState(
        config.name,
        config.width,
        config.height
      );
      if (savedState) {
        finalConfig = {
          ...finalConfig,
          x: savedState.x,
          y: savedState.y,
          width: savedState.width,
          height: savedState.height,
          fullscreen: savedState.isFullScreen || config.fullscreen,
        };
      }
    }

    const operator = new WindowCreator(
      api,
      {
        data: { ...finalConfig, winId: resolvedWindowId },
        contentLoader: this.wm.config.contentLoader,
      },
      async (options) => {
        // Call public/accessible method on wm
        const newWindow = this.wm.createBrowserWindow(options);

        // Restore maximized state
        if (shouldPersist && config.name) {
          const savedState = this.wm.windowStore.getWindowState(config.name);
          if (savedState?.isMaximized && !newWindow.isFullScreen()) {
            newWindow.maximize();
          }
        }

        const windowId = this.wm.windowStore.createWindow(newWindow, options);
        this.wm.configureWindowBehavior(newWindow, windowId);

        // Restore groups if any
        if (options.name) {
          const savedState = this.wm.windowStore.getWindowState(options.name);
          if (savedState && savedState.groups && Array.isArray(savedState.groups)) {
            savedState.groups.forEach((group: string) => {
              this.wm.windowStore.joinGroup(windowId, group);
            });
          }

          // Register state management (auto-save)
          // Access private method? No, registerStateManagement is private.
          // I should move registerStateManagement to WindowLifecycle or make it public.
          // I'll make it public or move it.
          // Moving it here is better.
          this.registerStateManagement(options.name, newWindow);
        }

        // Run onDidCreate hooks
        const details = { window: newWindow, id: windowId, name: options.data.name || '' };
        await this.pluginExecutor.onDidCreate(details);

        this.wm.emit('window-created', details);

        return windowId;
      },
      undefined,
      this.logger
    );

    const windowId = await operator.createAndShow();

    // Record metrics
    const duration = Date.now() - startTime;
    this.metrics.recordCreation(duration);

    if (duration > 2000) {
      this.logger.warn(`Slow window creation detected: ${windowId} took ${duration}ms`);
    }

    perf.endMeasure(measureId, { windowId });

    return windowId;
  }

  public async removeWindow(windowId: string): Promise<void> {
    const perf = PerformanceMonitor.getInstance();
    const measureId = `destroy-window-${windowId}`;
    perf.startMeasure(measureId, 'Window Destruction', { windowId });

    this.wm.validateWindowId(windowId, 'removeWindow');

    // 1. onWillDestroy Hooks
    await this.pluginExecutor.onWillDestroy(windowId);

    // 2. Notify MessageBus cleanup
    this.wm.emit('window-will-be-destroyed', windowId);

    // 3. Actual removal
    this.wm.windowStore.removeWindow(windowId);

    // Track destroyed count
    this.metrics.recordDestruction();

    // 4. onDidDestroy Hooks
    await this.pluginExecutor.onDidDestroy(windowId);

    this.wm.emit('window-destroyed', windowId);

    perf.endMeasure(measureId, { windowId });
  }

  private registerStateManagement(name: string, window: BrowserWindow): void {
    if (this.wm.windowStore.persistenceEnabled) {
      this.wm.windowStore.manageState(name, window, () =>
        this.wm.windowStore.getWindowGroups(window.id.toString())
      );
    }
  }
}
