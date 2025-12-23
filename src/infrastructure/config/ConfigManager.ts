import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { TypedEmitter } from 'tiny-typed-emitter';
import { ILogger, Logger } from '@/infrastructure/logger';
import { z } from 'zod';

/**
 * Config Manager Events
 * 配置管理器事件
 */
export interface ConfigManagerEvents {
  /**
   * Emitted when a configuration value changes
   * 当配置值发生变化时触发
   */
  change: (key: string, newValue: any, oldValue: any) => void;
  /**
   * Emitted when configuration is loaded from disk
   * 当配置从磁盘加载时触发
   */
  loaded: (config: Record<string, any>) => void;
  /**
   * Emitted when configuration is saved to disk
   * 当配置保存到磁盘时触发
   */
  saved: () => void;
  /**
   * Emitted when an error occurs
   * 当发生错误时触发
   */
  error: (error: Error) => void;
}

/**
 * Config Manager Options
 * 配置管理器选项
 */
export interface ConfigManagerOptions {
  /**
   * Configuration filename (default: 'config.json')
   * 配置文件名 (默认: 'config.json')
   */
  filename?: string;
  /**
   * Logger instance
   * 日志实例
   */
  logger?: ILogger;
  /**
   * Whether to automatically save on changes (default: true)
   * 是否在更改时自动保存 (默认: true)
   */
  autoSave?: boolean;
  /**
   * Save delay in milliseconds (debounce) (default: 100)
   * 保存延迟（毫秒，防抖） (默认: 100)
   */
  saveDelay?: number;
  /**
   * Zod schema for validation
   * 用于校验的 Zod schema
   */
  schema?: z.ZodType<any>;
}

/**
 * Config Manager
 * 配置管理器
 *
 * Manages application configuration with persistence and type safety support.
 * 管理具有持久化和类型安全支持的应用程序配置。
 */
export class ConfigManager extends TypedEmitter<ConfigManagerEvents> {
  private config: Record<string, any> = {};
  private filePath: string;
  private logger: ILogger;
  private autoSave: boolean;
  private saveTimer: NodeJS.Timeout | null = null;
  private saveDelay: number;
  private schema?: z.ZodType<any>;

  /**
   * Create ConfigManager instance
   * 创建 ConfigManager 实例
   */
  constructor(options: ConfigManagerOptions = {}) {
    super();
    this.logger = options.logger || new Logger({ appName: 'ConfigManager' });
    this.autoSave = options.autoSave ?? true;
    this.saveDelay = options.saveDelay || 100;
    this.schema = options.schema;

    const userDataPath = app.getPath('userData');
    this.filePath = path.join(userDataPath, options.filename || 'config.json');

    this.load();
  }

  /**
   * Get configuration value
   * 获取配置值
   *
   * @param key Dot-notation key (e.g., 'ui.theme') / 点符号键 (如 'ui.theme')
   * @param defaultValue Default value if key not found / 如果键未找到的默认值
   */
  public get<T>(key: string, defaultValue?: T): T {
    const value = this.getDeep(this.config, key);
    return value === undefined ? (defaultValue as T) : value;
  }

  /**
   * Set configuration value
   * 设置配置值
   *
   * @param key Dot-notation key (e.g., 'ui.theme') / 点符号键 (如 'ui.theme')
   * @param value Value to set / 要设置的值
   */
  public set(key: string, value: any): void {
    const oldValue = this.get(key);

    // Simple equality check to avoid unnecessary writes/events
    // 简单的相等性检查以避免不必要的写入/事件
    if (JSON.stringify(oldValue) === JSON.stringify(value)) {
      return;
    }

    // Validation
    if (this.schema) {
      const tempConfig = JSON.parse(JSON.stringify(this.config));
      this.setDeep(tempConfig, key, value);
      const result = this.schema.safeParse(tempConfig);
      if (!result.success) {
        throw new Error(`Configuration validation failed: ${result.error.message}`);
      }
    }

    this.setDeep(this.config, key, value);
    this.emit('change', key, value, oldValue);

    if (this.autoSave) {
      this.triggerSave();
    }
  }

  /**
   * Delete configuration value
   * 删除配置值
   *
   * @param key Dot-notation key / 点符号键
   */
  public delete(key: string): void {
    if (!this.has(key)) return;

    const oldValue = this.get(key);
    this.deleteDeep(this.config, key);
    this.emit('change', key, undefined, oldValue);

    if (this.autoSave) {
      this.triggerSave();
    }
  }

  /**
   * Check if key exists
   * 检查键是否存在
   */
  public has(key: string): boolean {
    return this.getDeep(this.config, key) !== undefined;
  }

  /**
   * Clear all configuration
   * 清除所有配置
   */
  public clear(): void {
    this.config = {};
    this.emit('change', '', {}, {}); // Root change
    if (this.autoSave) {
      this.triggerSave();
    }
  }

  /**
   * Force save configuration to disk
   * 强制保存配置到磁盘
   */
  public async save(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    try {
      const data = JSON.stringify(this.config, null, 2);
      await fs.promises.writeFile(this.filePath, data, 'utf-8');
      this.emit('saved');
      // this.logger.debug('Configuration saved');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to save configuration: ${err.message}`);
      this.emit('error', err);
    }
  }

  /**
   * Load configuration from disk
   * 从磁盘加载配置
   */
  public load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        let parsedConfig = JSON.parse(data);

        // Validation
        if (this.schema) {
          const result = this.schema.safeParse(parsedConfig);
          if (!result.success) {
            this.logger.error(`Configuration validation failed: ${result.error.message}`);
            this.emit(
              'error',
              new Error(`Configuration validation failed: ${result.error.message}`)
            );
            // We still load it, but maybe we should rely on the user to handle the error
            // Or maybe we should use the partial valid data?
            // For now, let's proceed with what we have, but logging the error is crucial.
          } else {
            parsedConfig = result.data;
          }
        }

        this.config = parsedConfig;
        this.emit('loaded', this.config);
        this.logger.info(`Configuration loaded from ${this.filePath}`);
      } else {
        this.logger.info('No configuration file found, starting with empty config');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Failed to load configuration: ${err.message}`);
      // Don't throw, just start with empty or partial config
      this.emit('error', err);
    }
  }

  /**
   * Get the full configuration object
   * 获取完整的配置对象
   */
  public getAll(): Record<string, any> {
    return JSON.parse(JSON.stringify(this.config));
  }

  // --- Private Helpers ---

  private triggerSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      this.save();
    }, this.saveDelay);
  }

  private getDeep(obj: any, path: string): any {
    if (!path) return undefined;
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null) return undefined;
      current = current[key];
    }

    return current;
  }

  private setDeep(obj: any, path: string, value: any): void {
    if (!path) return;
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[lastKey] = value;
  }

  private deleteDeep(obj: any, path: string): void {
    if (!path) return;
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    let current = obj;

    for (const key of keys) {
      if (current[key] === undefined || current[key] === null) return;
      current = current[key];
    }

    delete current[lastKey];
  }
}
