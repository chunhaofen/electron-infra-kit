import LoggerService from 'electron-log';
import { ILogger } from './logger.type';

/**
 * Logger Configuration Options
 * 日志配置选项
 */
export interface LoggerOptions {
  /** Application name for log identification / 应用名称用于日志标识 */
  appName?: string;
  /** Maximum log file size in bytes / 最大日志文件大小(字节) */
  maxSize?: number;
  /** Custom log file name / 自定义日志文件名 */
  fileName?: string;
  /** File log level / 文件日志级别 */
  fileLevel?: 'debug' | 'info' | 'warn' | 'error' | 'verbose' | 'silly' | false;
  /** Console log level / 控制台日志级别 */
  consoleLevel?: 'debug' | 'info' | 'warn' | 'error' | 'verbose' | 'silly' | false;
}

/**
 * Default logger implementation using electron-log
 * 使用 electron-log 的默认日志实现
 */
export class ElectronLogger implements ILogger {
  private logger: typeof LoggerService;
  private isDev: boolean;

  /**
   * Constructor for Logger
   * 日志记录器构造函数
   * @param options - Logger configuration options
   */
  constructor(options: LoggerOptions = {}) {
    this.isDev = process.env.NODE_ENV !== 'production';

    const {
      appName = 'main',
      maxSize = 10 * 1024 * 1024, // Default 10MB
      fileName,
      fileLevel,
      consoleLevel,
    } = options;

    // Create a logger instance for either 'main' or 'renderer'
    this.logger = LoggerService.create({ logId: appName });
    this.logger.scope(appName);

    // Set log levels with smart defaults based on environment
    // 根据环境设置日志级别，使用智能默认值
    const defaultFileLevel = this.isDev ? 'debug' : 'info';
    const defaultConsoleLevel = this.isDev ? 'debug' : false;

    this.logger.transports.file.level = fileLevel ?? defaultFileLevel;
    this.logger.transports.console.level = consoleLevel ?? defaultConsoleLevel;

    // Optimize log format with date and log level
    // 优化日志格式，增加日期和日志级别
    this.logger.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

    // Set maximum file size (configurable)
    // 设置最大文件大小（可配置）
    this.logger.transports.file.maxSize = maxSize;

    // Set log file name (configurable or default based on environment)
    // 设置日志文件名（可配置或根据环境使用默认值）
    this.logger.transports.file.fileName =
      fileName ?? (this.isDev ? `${appName}_dev.log` : `${appName}.log`);
  }

  // Info log
  info(message: string, ...args: any[]): void {
    this.logger.info(message, ...args);
  }

  // Debug log
  debug(message: string, ...args: any[]): void {
    this.logger.debug(message, ...args);
  }

  // Error log
  error(message: string, ...args: any[]): void {
    this.logger.error(message, ...args);
  }

  // Warn log
  warn(message: string, ...args: any[]): void {
    this.logger.warn(message, ...args);
  }

  // Verbose log
  verbose(message: string, ...args: any[]): void {
    this.logger.verbose(message, ...args);
  }

  // Silly log
  silly(message: string, ...args: any[]): void {
    this.logger.silly(message, ...args);
  }

  // Get the logger instance (useful if you need more custom configurations)
  getLogger(): typeof LoggerService {
    return this.logger;
  }
}
