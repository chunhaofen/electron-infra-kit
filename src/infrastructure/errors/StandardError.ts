import { ErrorCategory } from './ErrorCodes';

/**
 * Standard Error Response
 * 标准错误响应
 */
export interface ErrorResponse {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Error category */
  category?: ErrorCategory;
  /** Additional error details */
  details?: unknown;
  /** Error stack (only in development mode) */
  stack?: string;
  /** Timestamp */
  timestamp?: number;
}

/**
 * Standard Error Class
 * 标准错误类
 */
export class StandardError extends Error {
  public readonly code: number;
  public readonly category: ErrorCategory;
  public readonly details?: unknown;
  public readonly timestamp: number;

  constructor(
    code: number,
    message: string,
    category: ErrorCategory = ErrorCategory.INTERNAL,
    details?: unknown
  ) {
    super(message);
    this.name = 'StandardError';
    this.code = code;
    this.category = category;
    this.details = details;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StandardError);
    }
  }

  /**
   * Convert to error response
   * 转换为错误响应
   */
  toResponse(includeStack: boolean = false): ErrorResponse {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      details: this.details,
      stack: includeStack ? this.stack : undefined,
      timestamp: this.timestamp,
    };
  }

  /**
   * Create from unknown error
   * 从未知错误创建
   */
  static from(error: unknown, defaultCode: number = 500): StandardError {
    if (error instanceof StandardError) {
      return error;
    }

    if (error instanceof Error) {
      return new StandardError(defaultCode, error.message, ErrorCategory.INTERNAL, {
        originalError: error.name,
        stack: error.stack,
      });
    }

    return new StandardError(defaultCode, String(error), ErrorCategory.INTERNAL, {
      originalError: error,
    });
  }
}

/**
 * Validation Error
 * 验证错误
 */
export class ValidationError extends StandardError {
  constructor(message: string, details?: unknown) {
    super(422, message, ErrorCategory.VALIDATION, details);
    this.name = 'ValidationError';
  }
}

/**
 * Permission Error
 * 权限错误
 */
export class PermissionError extends StandardError {
  constructor(message: string, details?: unknown) {
    super(403, message, ErrorCategory.PERMISSION, details);
    this.name = 'PermissionError';
  }
}

/**
 * Not Found Error
 * 未找到错误
 */
export class NotFoundError extends StandardError {
  constructor(message: string, details?: unknown) {
    super(404, message, ErrorCategory.NOT_FOUND, details);
    this.name = 'NotFoundError';
  }
}
