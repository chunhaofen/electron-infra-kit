# Error Handling Guide

## Overview

The `electron-infra-kit` provides a unified error handling system with standardized error codes, error classes, and automatic error propagation across IPC boundaries.

## Error Codes

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

## Standard Error Classes

### StandardError

Base error class with code, category, and details:

```typescript
import { StandardError, ErrorCategory, IpcErrorCode } from 'electron-infra-kit';

// Create a standard error
throw new StandardError(
  IpcErrorCode.VALIDATION_ERROR,
  'Invalid user ID format',
  ErrorCategory.VALIDATION,
  { field: 'userId', expected: 'string', received: 'number' }
);
```

### Specialized Error Classes

```typescript
import { ValidationError, PermissionError, NotFoundError } from 'electron-infra-kit';

// Validation error (422)
throw new ValidationError('Email is required', { field: 'email' });

// Permission error (403)
throw new PermissionError('User not authorized to modify this resource', {
  userId: 'user-123',
  resource: 'admin-panel',
});

// Not found error (404)
throw new NotFoundError('User not found', { userId: 'user-123' });
```

## IPC Error Handling

### Main Process (Handler)

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { ValidationError, IpcErrorCode } from 'electron-infra-kit';
import { z } from 'zod';

const getUserHandler = new IpcHandler(
  'getUser',
  'user',
  async (api, payload: { id: string }) => {
    // Validation errors are automatically caught and formatted
    if (!payload.id) {
      throw new ValidationError('User ID is required', { field: 'id' });
    }

    const user = await api.db.findUser(payload.id);

    if (!user) {
      throw new NotFoundError('User not found', { userId: payload.id });
    }

    return user;
  },
  z.object({ id: z.string() })
);
```

### Renderer Process (Error Handling)

```typescript
// In renderer process
try {
  const user = await window.ipcApi.invoke('getUser', { id: '123' });
  console.log(user);
} catch (error) {
  // Error is automatically unwrapped from IPC response
  console.error('Failed to get user:', error.message);

  // In development mode, stack trace is included
  if (error.stack) {
    console.error('Stack:', error.stack);
  }
}
```

### Error Response Format

IPC responses now include detailed error information:

```typescript
interface IpcResponse<T> {
  code: number; // Error code (0 = success)
  message: string; // Error message
  data: T | null; // Response data (null on error)
  category?: ErrorCategory; // Error category (VALIDATION, PERMISSION, etc.)
  details?: unknown; // Additional error details
  stack?: string; // Stack trace (development mode only)
}
```

## Error Categories

```typescript
import { ErrorCategory } from 'electron-infra-kit';

enum ErrorCategory {
  VALIDATION = 'VALIDATION', // Input validation errors
  PERMISSION = 'PERMISSION', // Authorization errors
  NOT_FOUND = 'NOT_FOUND', // Resource not found
  INTERNAL = 'INTERNAL', // Internal server errors
  BUSINESS = 'BUSINESS', // Business logic errors
}
```

## Best Practices

### 1. Use Specific Error Classes

```typescript
// ❌ Bad: Generic error
throw new Error('Invalid input');

// ✅ Good: Specific error with details
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: 'invalid-email',
  expected: 'user@example.com',
});
```

### 2. Include Helpful Details

```typescript
// ❌ Bad: No context
throw new NotFoundError('Not found');

// ✅ Good: Detailed context
throw new NotFoundError('User not found', {
  userId: payload.id,
  searchedIn: 'users_table',
  timestamp: Date.now(),
});
```

### 3. Handle Errors Gracefully in Renderer

```typescript
// ❌ Bad: Silent failure
window.ipcApi.invoke('deleteUser', { id }).catch(() => {});

// ✅ Good: User feedback
try {
  await window.ipcApi.invoke('deleteUser', { id });
  showSuccess('User deleted successfully');
} catch (error) {
  if (error.message.includes('Permission')) {
    showError('You do not have permission to delete users');
  } else if (error.message.includes('Not found')) {
    showError('User not found');
  } else {
    showError('Failed to delete user. Please try again.');
  }
}
```

### 4. Convert Unknown Errors

```typescript
import { StandardError } from 'electron-infra-kit';

try {
  // Some operation that might throw any error
  await riskyOperation();
} catch (error) {
  // Convert to StandardError for consistent handling
  throw StandardError.from(error, 500);
}
```

## Development vs Production

In development mode (`process.env.NODE_ENV === 'development'`):

- Error stack traces are included in IPC responses
- Detailed error information is logged

In production mode:

- Stack traces are omitted for security
- Only essential error information is sent to renderer

## Migration from Legacy Errors

The kit maintains backward compatibility with legacy error classes:

```typescript
// Legacy errors still work
import { IpcHandlerError, WindowNotFoundError } from '@/infrastructure/errors';

// But new code should use StandardError
import { StandardError, NotFoundError } from 'electron-infra-kit';
```

## Example: Complete Error Handling Flow

```typescript
// main.ts
import { IpcHandler, ValidationError, NotFoundError } from 'electron-infra-kit';
import { z } from 'zod';

const updateUserHandler = new IpcHandler(
  'updateUser',
  'user',
  async (api, payload: { id: string; name: string }) => {
    // Validation
    if (!payload.name || payload.name.trim().length === 0) {
      throw new ValidationError('Name cannot be empty', { field: 'name' });
    }

    // Check existence
    const user = await api.db.findUser(payload.id);
    if (!user) {
      throw new NotFoundError('User not found', { userId: payload.id });
    }

    // Permission check
    if (!api.auth.canModifyUser(user)) {
      throw new PermissionError('Cannot modify this user', {
        userId: payload.id,
        currentUser: api.auth.getCurrentUser(),
      });
    }

    // Update
    return await api.db.updateUser(payload.id, { name: payload.name });
  },
  z.object({
    id: z.string(),
    name: z.string(),
  })
);

// renderer.ts
async function updateUserName(userId: string, newName: string) {
  try {
    const updatedUser = await window.ipcApi.invoke('updateUser', {
      id: userId,
      name: newName,
    });

    showSuccess(`User ${updatedUser.name} updated successfully`);
    return updatedUser;
  } catch (error: any) {
    // Handle specific error types
    if (error.message.includes('empty')) {
      showError('Please enter a valid name');
    } else if (error.message.includes('not found')) {
      showError('User no longer exists');
    } else if (error.message.includes('Cannot modify')) {
      showError('You do not have permission to modify this user');
    } else {
      showError('Failed to update user. Please try again.');
      console.error('Update error:', error);
    }
    throw error;
  }
}
```
