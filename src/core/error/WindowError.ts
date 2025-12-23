/**
 * Window Error Codes
 * 窗口错误代码
 */
export enum WindowErrorCode {
  // Configuration Errors (1000-1999)
  CONFIG_INVALID = 1001,
  CONFIG_MISSING = 1002,

  // Window Management Errors (2000-2999)
  WINDOW_NOT_FOUND = 2001,
  WINDOW_CREATION_FAILED = 2002,
  WINDOW_ALREADY_EXISTS = 2003,
  WINDOW_LIMIT_REACHED = 2004,
  WINDOW_DESTROYED = 2005,

  // IPC/Communication Errors (3000-3999)
  IPC_CONNECTION_FAILED = 3001,
  IPC_TIMEOUT = 3002,
  IPC_HANDLER_ERROR = 3003,

  // System/Internal Errors (5000-5999)
  INTERNAL_ERROR = 5001,
  DEPENDENCY_MISSING = 5002,
}

/**
 * Window Error Options
 * 窗口错误选项
 */
export interface WindowErrorOptions {
  code: WindowErrorCode;
  message: string;
  originalError?: Error | unknown;
  details?: Record<string, any>;
  suggestion?: string;
}

/**
 * Window Error Class
 * 窗口错误类
 *
 * Structured error handling for the WindowManager
 * 为 WindowManager 提供结构化的错误处理
 */
export class WindowError extends Error {
  public readonly code: WindowErrorCode;
  public readonly originalError?: Error | unknown;
  public readonly details?: Record<string, any>;
  public readonly suggestion?: string;

  constructor(options: WindowErrorOptions) {
    super(options.message);
    this.name = 'WindowError';
    this.code = options.code;
    this.originalError = options.originalError;
    this.details = options.details;
    this.suggestion = options.suggestion;

    // Fix prototype chain for custom errors
    Object.setPrototypeOf(this, WindowError.prototype);
  }

  /**
   * Get error category based on code
   * 根据错误代码获取错误类别
   */
  public getErrorCategory(): 'configuration' | 'window' | 'ipc' | 'system' | 'unknown' {
    if (this.code >= 1000 && this.code < 2000) return 'configuration';
    if (this.code >= 2000 && this.code < 3000) return 'window';
    if (this.code >= 3000 && this.code < 4000) return 'ipc';
    if (this.code >= 5000 && this.code < 6000) return 'system';
    return 'unknown';
  }

  public toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.getErrorCategory(),
      details: this.details,
      suggestion: this.suggestion,
    };
  }
}
