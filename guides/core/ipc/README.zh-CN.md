# IpcRouter - IPC Communication Router / IPC 通信路由

`IpcRouter` is a lightweight, highly scalable IPC (Inter-Process Communication) management module designed for Electron applications. It addresses common issues in traditional IPC communication such as scattered logic, high coupling, and maintenance difficulties.

`IpcRouter` 是一个轻量级、高度可扩展的 IPC（进程间通信）管理模块，专为 Electron 应用设计，旨在解决传统 IPC 通信中存在的逻辑分散、耦合度高、难以维护等问题。

It adopts **Dependency Injection** and **Single Channel Multiplexing** design patterns, transforming IPC communication into a pluggable "Handler" mode, completely decoupling business logic from infrastructure.

它采用 **依赖注入 (Dependency Injection)** 和 **单通道多路复用** 的设计思想，将 IPC 通信转化为可插拔的“处理器”模式，使业务逻辑与基础设施完全解耦。

## Features / 特性

- **Dependency Injection / 依赖注入**:
  Inject dependencies (like `app`, `windowManager`, `fs`) at runtime. Handlers focus on "using APIs" without worrying about "where APIs come from".
  在运行时注入依赖（如 `app`、`windowManager`、`fs`）。Handler 只需关注“使用 API”而无需关心“API 从哪来”。

- **Type Safety with Generics / 泛型类型安全**:
  Supports TypeScript generics for handlers (`IpcHandler<Context, Payload, Result>`), ensuring compile-time safety for injected dependencies, request payloads, and return types.
  支持 TypeScript 泛型（`IpcHandler<Context, Payload, Result>`），确保注入依赖、请求载荷和返回值的编译时类型安全。

- **Single Channel Multiplexing / 单通道多路复用**:
  Only **one** IPC listener is needed in the main process. `IpcRouter` handles dispatching logic internally, keeping `main.ts` clean.
  主进程只需要保留**一个** IPC 监听入口。所有的业务逻辑分发都由 `IpcRouter` 内部完成，保持 `main.ts` 的整洁。

- **Runtime Validation / 运行时校验**:
  Built-in `Zod` schema validation support ensures data safety and type consistency for IPC payloads.
  内置 `Zod` schema 校验支持，确保 IPC 载荷的数据安全和类型一致性。

- **Open-Closed Principle / 开闭原则**:
  Add new features by simply adding new `IpcHandler`s without modifying initialization code.
  新增功能时，只需添加新的 `IpcHandler`，无需修改初始化代码。

## Architecture Design / 架构设计

```
Renderer Process / 渲染进程           Main Process / 主进程
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
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
│                      │          │            │                        │
└──────────────────────┘          └─────────────────────────────────────┘
```

**Flow Description / 流程详解：**

1.  **Request Initiation / 请求发起**: Renderer sends a request via a single channel with the target handler name (`name`) and payload.
    渲染进程通过单一通道发送请求，附带目标处理器名称（`name`）和载荷。
2.  **Unified Dispatch / 统一分发**: The main process listener forwards the request to `IpcRouter`.
    主进程的监听器将请求转交给 `IpcRouter`。
3.  **Validation & Injection / 校验与注入**: `IpcRouter` validates the request format and payload (if schema provided), finds the corresponding Handler, and injects dependencies.
    `IpcRouter` 校验请求格式和载荷（如果提供了 Schema），找到对应的 Handler，并注入依赖。
4.  **Execution & Return / 执行与返回**: Handler executes business logic and returns the result.
    Handler 执行业务逻辑并返回结果。

## 内部架构 (Internal Architecture)

### 1. 消息分发 (MessageDispatcher)

核心分发逻辑委托给 `MessageDispatcher`，它维护着处理器及其元数据的注册表。

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

当调用 `handle()` 时：
1. **查找 (Lookup)**：通过名称查找处理器。
2. **验证 (Validation)**：根据 Zod Schema 验证 payload（如果存在元数据）。
3. **执行 (Execution)**：使用注入的上下文执行回调。

### 2. 限流策略 (RateLimiter)

`RateLimiter` 实现了 **时间窗口计数器 (Time-Window Counter)** 算法来控制请求频率。

```typescript
// State Tracking
interface RateLimitState {
  count: number;      // Current request count
  resetTime: number;  // When the window resets
}
```

- **机制**：每个唯一键（例如 `windowId:handlerName`）都有一个计数器。
- **重置**：如果 `Date.now() > resetTime`，计数器重置为 0。
- **清理**：后台定时器定期移除过期的状态以防止内存泄漏。

### 3. 依赖注入流程 (Dependency Injection Flow)

依赖项在运行时通过浅拷贝合并注入到处理器的上下文中。

```typescript
// Injection Logic
const context = { ...this._api }; // Shallow copy of global dependencies
return entry.callback(context, data);
```

这确保了：
- 处理器关于依赖项是无状态的。
- 依赖项可以轻松地进行热替换或模拟以进行测试。

## Usage / 使用方法

### 1. Define Context Type / 定义上下文类型

First, define what dependencies your handlers will receive.
首先，定义处理器将接收哪些依赖。

```typescript
// types.ts
import { App } from 'electron';
import { Types } from 'electron-infra-kit';

export interface AppContext {
  app: App;
  logger: Types.ILogger;
  db: any;
}
```

### 2. Define Handlers / 定义处理器

Separating business logic into independent files makes testing and maintenance easier.
将业务逻辑拆分到独立的文件中，便于测试和维护。

```typescript
// handlers/user-handlers.ts
import { IpcHandler } from 'electron-infra-kit';
import { z } from 'zod';
import { AppContext } from '../types';

// Define validation schema / 定义校验 Schema
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

// IpcHandler<Context, Payload, Result>
export const updateUserHandler = new IpcHandler<AppContext, Payload, Result>(
  'updateUser', // Handler Name / 处理器名称
  'user-update', // Event Type / 事件类型
  async (context, data) => {
    // 'context' is typed as AppContext
    // 'context' 被类型化为 AppContext
    const { id, updateData } = data;
    context.logger.info(`Updating user: ${id}`);

    const result = await context.db.users.update(id, updateData);
    return { success: true, user: result };
  },
  UserSchema // Optional Zod Schema / 可选的 Zod Schema
);
```

### 3. Initialize in Main Process / 主进程初始化

```typescript
// main.ts
import { app } from 'electron';
import { IpcRouter } from 'electron-infra-kit';
import Logger from './logger';
import { updateUserHandler } from './handlers/user-handlers';

// 1. Create Logger / 创建日志实例
const logger = new Logger('main');

// 2. Instantiate IpcRouter / 实例化 IpcRouter
const ipcRouter = new IpcRouter({ logger });

// 3. Inject Dependencies / 注入依赖
// Method A: Single Injection / 方式 A：单个注入
// ipcRouter.addApi("app", app);

// Method B: Batch Injection / 方式 B：批量注入
ipcRouter.addApis({
  app,
  logger,
  db: databaseInstance,
});

// 4. Register Handlers / 注册处理器
ipcRouter.addHandler(updateUserHandler);

// 5. Setup IPC Channel / 设置 IPC 通道
import { ipcMain } from 'electron';

ipcMain.handle('renderer-to-main', async (_, data) => {
  try {
    // Use the handle method
    return await ipcRouter.handle(data);
  } catch (error) {
    logger.error('IPC Error:', error);
    // Return standard error format
    return { code: 500, message: error.message };
  }
});
```

### 4. Call from Renderer / 渲染进程调用

```typescript
// renderer.ts
const updateData = {
  name: 'updateUser', // Matches handler name
  payload: {
    id: 'user-123',
    updateData: { name: 'New Name' },
  },
};

// Invoke via IPC / 通过 IPC 调用
const result = await window.ipcApi.invoke('renderer-to-main', updateData);
```

### 5. Rate Limiting / 限流防护

Protect your application from DoS attacks or excessive calls from the renderer.
保护您的应用程序免受 DoS 攻击或渲染进程的过度调用。

```typescript
// Global rate limit: 1000 requests per minute per window
// 全局限流：每个窗口每分钟 1000 次请求
const ipcRouter = new IpcRouter({
  defaultRateLimit: {
    window: 60000, // 1 minute
    max: 1000,
  },
});

// Per-handler rate limit
// 单个处理器的限流
ipcRouter.setRateLimit('updateUser', {
  window: 1000, // 1 second
  max: 5, // 5 requests
});
```

### 6. Batch API Injection / 批量 API 注入

Inject multiple dependencies at once to simplify setup.
一次注入多个依赖项以简化设置。

```typescript
ipcRouter.addApis({
  app: app,
  db: databaseConnection,
  config: configManager,
  utils: {
    formatDate: (date) => date.toISOString(),
  },
});
```

### 7. Error Handling / 错误处理

Use `IpcHandlerError` to return structured error information to the renderer.
使用 `IpcHandlerError` 向渲染进程返回结构化的错误信息。

```typescript
import { IpcHandlerError } from 'electron-infra-kit';

new IpcHandler('risky-action', 'utils', async (ctx, data) => {
  if (!data.isValid) {
    // Returns { code: 400, message: 'Invalid Input', data: { field: 'id' } }
    throw new IpcHandlerError('validation_error', 'Invalid Input', { field: 'id' });
  }
});
```

### 8. Performance Monitoring / 性能监控

`IpcRouter` automatically integrates with `PerformanceMonitor` to track slow requests.
`IpcRouter` 自动集成 `PerformanceMonitor` 以跟踪慢速请求。

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

// 1. Enable monitoring
// 1. 启用监控
EnhancedDebugHelper.getInstance().enablePerformanceMonitoring();

// 2. View metrics (in DevTools)
// 2. 查看指标（在 DevTools 中）
// global.__ELECTRON_TOOLKIT_DEBUG__.getStatistics().ipc
```

### 9. Batch Handler Management / 批量处理器管理

Manage multiple handlers efficiently.
高效地管理多个处理器。

```typescript
// Add multiple handlers
// 批量添加处理器
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
  )
]);

// Remove handler by name
// 根据名称移除处理器
ipcRouter.removeHandler('getUser');
```

### 10. Resource Disposal / 资源释放

Clean up resources when they are no longer needed.
当不再需要资源时清理它们。

```typescript
// Clear all handlers and rate limiters
// 清除所有处理器和限流器
ipcRouter.dispose();
```

## API Reference / API 参考

### IpcRouter

#### Constructor / 构造函数

```typescript
constructor(options?: { logger?: ILogger; defaultRateLimit?: RateLimitConfig })
```

- **options**: Configuration object / 配置对象
  - **logger**: Optional logger instance implementing `ILogger` interface. / 可选的日志实例。
  - **defaultRateLimit**: Optional rate limit configuration. / 可选的默认限流配置。

#### Methods / 方法

| Method / 方法           | Parameters / 参数         | Description / 描述                             |
| ----------------------- | ------------------------- | ---------------------------------------------- |
| `addApi(key, api)`      | `key: string`, `api: any` | Inject a dependency API / 注入依赖 API         |
| `addApis(apis)`         | `apis: object`            | Batch inject APIs / 批量注入 API               |
| `addHandler(handler)`   | `handler: IpcHandler`     | Register a single handler / 注册单个处理器     |
| `addHandlers(handlers)` | `handlers: IpcHandler[]`  | Register multiple handlers / 批量注册处理器    |
| `removeHandler(name)`   | `name: string`            | Remove a handler by name / 根据名称移除处理器  |
| `handle(data)`          | `data: IpcRequest`        | Dispatch request to handler / 分发请求给处理器 |

### IpcHandler

#### Constructor / 构造函数

```typescript
constructor(
  name: string,
  event: string,
  callback: HandlerCallback<Context, T, R>,
  schema?: ZodType
)
```

#### Properties / 属性

| Property / 属性 | Type / 类型 | Description / 描述                           |
| --------------- | ----------- | -------------------------------------------- |
| `name`          | `string`    | Unique handler identifier / 唯一处理器标识   |
| `event`         | `string`    | Event category/metadata / 事件分类或元数据   |
| `callback`      | `Function`  | Business logic function / 业务逻辑函数       |
| `schema`        | `ZodType`   | Optional validation schema / 可选校验 Schema |

#### `setRateLimit(handlerName: string, config: RateLimitConfig): void`

Sets a rate limit for a specific handler.
为特定处理器设置限流。

- `config.window`: Time window in ms. (时间窗口，毫秒)
- `config.max`: Max requests per window. (每个窗口的最大请求数)

#### `setDefaultRateLimit(config: RateLimitConfig): void`

Sets the default rate limit for all handlers.
为所有处理器设置默认限流。

#### `dispose(): void`

Clears all handlers, rate limiters, and releases resources.
清除所有处理器、限流器并释放资源。
