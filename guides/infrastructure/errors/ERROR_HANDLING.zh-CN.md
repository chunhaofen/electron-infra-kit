# 错误处理指南

## 概述

electron-infra-kit 提供了统一的错误处理系统，包含标准化的错误代码、错误类以及跨 IPC 边界的自动错误传播机制。

## 错误代码

### IpcErrorCode

```typescript
import { IpcErrorCode } from 'electron-infra-kit';

enum IpcErrorCode {
  SUCCESS = 0,
  BAD_REQUEST = 400,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  VALIDATION_ERROR = 422,
  INTERNAL_ERROR = 500,
  HANDLER_ERROR = 501,
}
```

### MessageBusErrorCode

```typescript
import { MessageBusErrorCode } from 'electron-infra-kit';

enum MessageBusErrorCode {
  SUCCESS = 0,
  PERMISSION_DENIED = 403,
  NOT_FOUND = 404,
  INVALID_OPERATION = 400,
  INTERNAL_ERROR = 500,
}
```

### WindowManagerErrorCode

```typescript
import { WindowManagerErrorCode } from 'electron-infra-kit';

enum WindowManagerErrorCode {
  SUCCESS = 0,
  WINDOW_NOT_FOUND = 404,
  WINDOW_ALREADY_EXISTS = 409,
  INVALID_CONFIG = 400,
  CREATION_FAILED = 500,
  OPERATION_FAILED = 500,
}
```

## 标准错误类

### StandardError

基础错误类，包含代码、分类和详细信息：

```typescript
import { StandardError, ErrorCategory, IpcErrorCode } from 'electron-infra-kit';

// 创建标准错误
throw new StandardError(
  IpcErrorCode.VALIDATION_ERROR,
  '无效的用户ID格式',
  ErrorCategory.VALIDATION,
  { field: 'userId', expected: 'string', received: 'number' }
);
```

### 专门化的错误类

```typescript
import { ValidationError, PermissionError, NotFoundError } from 'electron-infra-kit';

// 验证错误 (422)
throw new ValidationError('邮箱是必填项', { field: 'email' });

// 权限错误 (403)
throw new PermissionError('用户无权修改此资源', {
  userId: 'user-123',
  resource: 'admin-panel',
});

// 未找到错误 (404)
throw new NotFoundError('用户未找到', { userId: 'user-123' });
```

## IPC 错误处理

### 主进程 (处理器)

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { ValidationError, IpcErrorCode } from 'electron-infra-kit';
import { z } from 'zod';

const getUserHandler = new IpcHandler(
  'getUser',
  'user:get',
  async (ctx, payload) => {
      // ... implementation
  }
);
```
