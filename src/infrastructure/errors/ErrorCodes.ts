/**
 * Unified Error Codes for electron-infra-kit
 * 统一的错误码定义
 */

/**
 * IPC Error Codes
 * IPC 错误码
 */
export enum IpcErrorCode {
  /** Success */
  SUCCESS = 200,

  /** Bad Request - Invalid payload or parameters */
  BAD_REQUEST = 400,

  /** Forbidden - Permission denied */
  FORBIDDEN = 403,

  /** Not Found - Handler not found */
  NOT_FOUND = 404,

  /** Validation Error - Schema validation failed */
  VALIDATION_ERROR = 422,

  /** Internal Server Error */
  INTERNAL_ERROR = 500,

  /** Handler Execution Error */
  HANDLER_ERROR = 501,
}

/**
 * MessageBus Error Codes
 * MessageBus 错误码
 */
export enum MessageBusErrorCode {
  /** Success */
  SUCCESS = 200,

  /** Permission Denied - Field permission check failed */
  PERMISSION_DENIED = 403,

  /** Not Found - Window or field not found */
  NOT_FOUND = 404,

  /** Invalid Operation */
  INVALID_OPERATION = 400,

  /** Internal Error */
  INTERNAL_ERROR = 500,
}

/**
 * WindowManager Error Codes
 * WindowManager 错误码
 */
export enum WindowManagerErrorCode {
  /** Success */
  SUCCESS = 200,

  /** Window Not Found */
  WINDOW_NOT_FOUND = 404,

  /** Window Already Exists */
  WINDOW_ALREADY_EXISTS = 409,

  /** Invalid Configuration */
  INVALID_CONFIG = 400,

  /** Creation Failed */
  CREATION_FAILED = 500,

  /** Operation Failed */
  OPERATION_FAILED = 500,
}

/**
 * Error Category
 * 错误类别
 */
export enum ErrorCategory {
  /** Validation Error */
  VALIDATION = 'VALIDATION',

  /** Permission Error */
  PERMISSION = 'PERMISSION',

  /** Not Found Error */
  NOT_FOUND = 'NOT_FOUND',

  /** Internal Error */
  INTERNAL = 'INTERNAL',

  /** Business Logic Error */
  BUSINESS = 'BUSINESS',
}
