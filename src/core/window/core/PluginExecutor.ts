import { BrowserWindow } from 'electron';
import { WindowManagerPlugin, LifecycleHooks, WindowCreationOptions } from '../window-manager.type';
import { ILogger } from '@/infrastructure/logger';
import type WindowManager from '../WindowManager';

export class PluginExecutor {
  private plugins: WindowManagerPlugin[] = [];
  private hooks: LifecycleHooks = {};
  private logger: ILogger;

  constructor(logger: ILogger, plugins: WindowManagerPlugin[] = [], hooks: LifecycleHooks = {}) {
    this.logger = logger;
    this.plugins = plugins;
    this.hooks = hooks;
  }

  public addPlugin(plugin: WindowManagerPlugin): void {
    this.plugins.push(plugin);
  }

  public getPlugins(): WindowManagerPlugin[] {
    return this.plugins;
  }

  public async initPlugins(wm: WindowManager): Promise<void> {
    for (const plugin of this.plugins) {
      try {
        await plugin.onInit?.(wm);
      } catch (error) {
        this.logger.error(`Plugin "${plugin.name}" initialization failed: ${error}`);
      }
    }
  }

  public async initPlugin(plugin: WindowManagerPlugin, wm: WindowManager): Promise<void> {
    try {
      await plugin.onInit?.(wm);
    } catch (error) {
      this.logger.error(`Plugin "${plugin.name}" initialization failed: ${error}`);
    }
  }

  public onWillCreate(config: WindowCreationOptions): WindowCreationOptions | false {
    let hookConfig = { ...config };

    // 1. Plugins
    for (const plugin of this.plugins) {
      if (plugin.onWillCreate) {
        const result = plugin.onWillCreate(hookConfig);
        if (result === false) return false;
        if (result && typeof result === 'object') hookConfig = result;
      }
    }

    // 2. Lifecycle Hooks
    if (this.hooks.onWillCreate) {
      const result = this.hooks.onWillCreate(hookConfig);
      if (result === false) return false;
      if (result && typeof result === 'object') hookConfig = result;
    }

    return hookConfig;
  }

  public async onDidCreate(details: {
    window: BrowserWindow;
    id: string;
    name?: string;
  }): Promise<void> {
    for (const p of this.plugins) {
      try {
        await p.onDidCreate?.(details);
      } catch (e) {
        this.logger.error(`Plugin ${p.name} onDidCreate failed: ${e}`);
      }
    }

    if (this.hooks.onDidCreate) {
      try {
        await this.hooks.onDidCreate(details);
      } catch (e) {
        this.logger.error(`Hook onDidCreate failed: ${e}`);
      }
    }
  }

  public async onWillDestroy(windowId: string): Promise<void> {
    for (const p of this.plugins) {
      try {
        await p.onWillDestroy?.(windowId);
      } catch (e) {
        this.logger.error(`Plugin ${p.name} onWillDestroy failed: ${e}`);
      }
    }

    if (this.hooks.onWillDestroy) {
      try {
        await this.hooks.onWillDestroy(windowId);
      } catch (e) {
        this.logger.error(`Hook onWillDestroy failed: ${e}`);
      }
    }
  }

  public async onDidDestroy(windowId: string): Promise<void> {
    for (const p of this.plugins) {
      try {
        await p.onDidDestroy?.(windowId);
      } catch (e) {
        this.logger.error(`Plugin ${p.name} onDidDestroy failed: ${e}`);
      }
    }

    if (this.hooks.onDidDestroy) {
      try {
        await this.hooks.onDidDestroy(windowId);
      } catch (e) {
        this.logger.error(`Hook onDidDestroy failed: ${e}`);
      }
    }
  }
}
