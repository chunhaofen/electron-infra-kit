# IPC Router - IPC Communication Router

[English](./README.md) | [简体中文](./README.zh-CN.md)

`IpcRouter` is a lightweight, highly scalable IPC (Inter-Process Communication) management module designed for Electron applications. It addresses common issues in traditional IPC communication such as scattered logic, high coupling, and maintenance difficulties.

It adopts **Dependency Injection** and **Single Channel Multiplexing** design patterns, transforming IPC communication into a pluggable "Handler" mode, completely decoupling business logic from infrastructure.

## Features

- **Dependency Injection**: Inject dependencies (like `app`, `windowManager`, `fs`) at runtime. Handlers focus on "using APIs" without worrying about "where APIs come from".

- **Type Safety with Generics**: Supports TypeScript generics for handlers (`IpcHandler<Context, Payload, Result>`), ensuring compile-time safety for injected dependencies, request payloads, and return types.

- **Single Channel Multiplexing**: Only **one** IPC listener is needed in the main process. `IpcRouter` handles dispatching logic internally, keeping `main.ts` clean.

- **Runtime Validation**: Built-in `Zod` schema validation support ensures data safety and type consistency for IPC payloads.

- **Open-Closed Principle**: Add new features by simply adding new `IpcHandler`s without modifying initialization code.

## Architecture Design

```
Renderer Process                      Main Process
┌──────────────────────┐          ┌─────────────────────────────────────┐
│                      │          │                                     │
│  ipcRenderer.invoke  │─────────►│  ipcMain.handle('channel')          │
│   (name, data)       │          │            │                        │
│                      │          │            ▼                        │
│                      │          │      ┌─────────────┐                │
│                      │          │      │  IpcRouter  │                │
│                      │          │      └─────────────┘                │
│                      │          │            │                        │
│                      │          │    1. Validate Request (Zod)        │
│                      │          │    2. Find Handler by 'name'        │
│                      │          │    3. Inject API (DI Container)     │
│                      │          │            │                        │
│                      │          │            ▼                        │
│                      │          │      ┌─────────────┐                │
│                      │          │      │ IpcHandler  │                │
│                      │          │      │ (Business)  │◄── APIs        │
│                      │          │      └─────────────┘                │
│                      │          │            │                        │
│                      │          │            ▼                        │
│                      │          │      Return Result                  │
│                      │          │    (Promise<Result>)                │
└──────────────────────┘          └─────────────────────────────────────┘
```

## Internal Architecture

### 1. Message Dispatching (MessageDispatcher)

The core dispatching logic is delegated to `MessageDispatcher`, which maintains a registry of handlers and their metadata.

```typescript
// Registry Structure
private handlers = new Map<
  string,
  {
    callback: HandlerCallback<Context, any, any>;
    metadata?: any; // Zod Schema
  }
>();
```

When `handle()` is called:

1. **Lookup**: Finds handler by name.
2. **Validation**: Validates payload against Zod schema (if metadata exists).
3. **Execution**: Executes callback with injected context.

### 2. Rate Limiting Strategy (RateLimiter)

`RateLimiter` implements a **Time-Window Counter** algorithm to control request frequency.

```typescript
// State Tracking
interface RateLimitState {
  count: number; // Current request count
  resetTime: number; // When the window resets
}
```

- **Mechanism**: Each unique key (e.g., `windowId:handlerName`) has a counter.
- **Reset**: If `Date.now() > resetTime`, the counter resets to 0.
- **Cleanup**: A background timer periodically removes expired states to prevent memory leaks.

### 3. Dependency Injection Flow

Dependencies are injected into the handler's context at runtime via shallow merging.

```typescript
// Injection Logic
const context = { ...this._api }; // Shallow copy of global dependencies
return entry.callback(context, data);
```

This ensures that:

- Handlers are stateless regarding dependencies.
- Dependencies can be hot-swapped or mocked easily for testing.

## Usage

### 1. Define Context Type

```typescript
import { App } from 'electron';
import { Types } from 'electron-infra-kit';

export interface AppContext {
  app: App;
  logger: Types.ILogger;
  db: any;
}
```

### 2. Define Handlers

```typescript
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';
import { AppContext } from '../types';

const UserSchema = z.object({
  id: z.string(),
  updateData: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

type Payload = z.infer<typeof UserSchema>;
type Result = { success: boolean; user: any };

export const updateUserHandler = new IpcHandler<AppContext, Payload, Result>(
  'updateUser',
  'user-update',
  async (context, data) => {
    const { id, updateData } = data;
    context.logger.info(`Updating user: ${id}`);
    // Simulated DB call
    // const result = await context.db.users.update(id, updateData);
    return { success: true, user: { id, ...updateData } };
  },
  UserSchema
);
```

### 3. Initialize in Main Process

```typescript
import { app } from 'electron';
import { IpcRouter } from 'electron-infra-kit';
import Logger from './logger';
import { updateUserHandler } from './handlers/user-handlers';

const logger = new Logger('main');
const ipcRouter = new IpcRouter({ logger });

ipcRouter.addApi('app', app);
ipcRouter.addApi('logger', logger);
ipcRouter.addApi('db', databaseInstance);

ipcRouter.addHandler(updateUserHandler);

import { ipcMain } from 'electron';

ipcMain.handle('renderer-to-main', async (_, data) => {
  try {
    return await ipcRouter.handle(data);
  } catch (error) {
    logger.error('IPC Error:', error);
    return { code: 500, message: error.message };
  }
});
```

### 4. Call from Renderer

```typescript
const updateData = {
  name: 'updateUser',
  payload: {
    id: 'user-123',
    updateData: { name: 'New Name' },
  },
};

const result = await window.ipcApi.invoke('renderer-to-main', updateData);
```

### 5. Rate Limiting

Prevent abuse by limiting the number of requests per window/handler.

```typescript
// Configure at IpcRouter level (default)
const ipcRouter = new IpcRouter({
  defaultRateLimit: {
    window: 60000, // 1 minute window
    max: 100, // 100 requests per window
  },
});

// Configure for specific handler
ipcRouter.setRateLimit('updateUser', {
  window: 1000, // 1 second
  max: 5, // 5 requests per second
});
```

### 6. Batch API Injection

Inject multiple dependencies at once.

```typescript
ipcRouter.addApis({
  app: app,
  db: database,
  config: configService,
  fs: fileSystem,
});
```

### 7. Error Handling

Use `IpcHandlerError` to return structured errors to the renderer.

```typescript
import { IpcHandlerError } from 'electron-infra-kit';

new IpcHandler('getData', 'get-data', async (ctx, data) => {
  if (!data.id) {
    // Returns a structured error object to renderer
    throw new IpcHandlerError('validation', new Error('ID is required'));
  }

  try {
    return await ctx.db.get(data.id);
  } catch (err) {
    // Internal errors are automatically caught and wrapped
    throw err;
  }
});
```

### 8. Performance Monitoring

IPC calls are automatically instrumented using `PerformanceMonitor`.

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
const snapshot = debug.getDebugSnapshot();

// View IPC performance metrics
console.log(snapshot.performance.filter((m) => m.category === 'IPC Call'));
```

### 9. Batch Handler Management

Manage multiple handlers efficiently.

```typescript
// Add multiple handlers
ipcRouter.addHandlers([
  new IpcHandler(
    'getUser',
    'get-user',
    async (ctx, req) => ctx.db.getUser(req.id),
    z.object({ id: z.string() })
  ),
  new IpcHandler(
    'deleteUser',
    'delete-user',
    async (ctx, req) => ctx.db.deleteUser(req.id),
    z.object({ id: z.string() })
  ),
]);

// Remove handler by name
ipcRouter.removeHandler('getUser');
```

### 10. Resource Disposal

Clean up handlers and rate limiters when they are no longer needed.

```typescript
// Removes all handlers and stops cleanup timers
ipcRouter.dispose();
```

## API Reference

### IpcRouter

#### Constructor

```typescript
constructor(options?: { logger?: ILogger; defaultRateLimit?: RateLimitConfig })
```

#### Methods

| Method                  | Parameters                | Description                 |
| ----------------------- | ------------------------- | --------------------------- |
| `addApi(key, api)`      | `key: string`, `api: any` | Inject a dependency API     |
| `addApis(apis)`         | `apis: object`            | Batch inject APIs           |
| `addHandler(handler)`   | `handler: IpcHandler`     | Register a single handler   |
| `addHandlers(handlers)` | `handlers: IpcHandler[]`  | Register multiple handlers  |
| `removeHandler(name)`   | `name: string`            | Remove a handler by name    |
| `handle(data)`          | `data: IpcRequest`        | Dispatch request to handler |

### IpcHandler

#### Constructor

```typescript
constructor(
  name: string,
  event: string,
  callback: HandlerCallback<Context, T, R>,
  schema?: ZodType
)
```

#### Properties

| Property   | Type       | Description                |
| ---------- | ---------- | -------------------------- |
| `name`     | `string`   | Unique handler identifier  |
| `event`    | `string`   | Event category/metadata    |
| `callback` | `Function` | Business logic function    |
| `schema`   | `ZodType`  | Optional validation schema |

#### `setRateLimit(handlerName: string, config: RateLimitConfig): void`

Sets a rate limit for a specific handler.

- `config.window`: Time window in ms.
- `config.max`: Max requests per window.

#### `setDefaultRateLimit(config: RateLimitConfig): void`

Sets the default rate limit for all handlers.

#### `dispose(): void`

Clears all handlers, rate limiters, and releases resources.
