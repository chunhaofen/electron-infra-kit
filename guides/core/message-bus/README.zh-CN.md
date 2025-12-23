# MessageBus Module / 消息总线模块

[English](./README.md) | [简体中文](./README.zh-CN.md)

`MessageBus` 是一个功能强大、高度可扩展的多窗口状态管理和通信模块，专为 Electron 应用设计，解决了传统多窗口应用中状态不一致、通信复杂等问题。

它支持多种传输策略（**MessageChannel** 或 **IPC**），通过共享状态和事件广播实现窗口间的实时数据同步与通信，同时提供了灵活的权限控制机制，确保数据安全。

## Features / 核心价值

### 1. Real-time State Broadcasting / 实时状态广播

在多窗口应用中，保持各窗口数据一致是最大的挑战（例如：在一个窗口修改了主题，所有窗口都需要立即响应）。`MessageBus` 实现了一个“单一数据源”模型：任何窗口修改数据，Bus 会自动将变更**广播**给所有其他已注册的窗口。

### 2. High Performance & Flexibility / 高性能与灵活性

- **自动传输选择 (Auto Transport Selection)**：自动选择最佳的传输机制。
- **MessagePort 模式**：基于 `MessageChannelMain`，直接在进程间传递消息（零拷贝），效率更高，延迟更低。
- **IPC 模式**：在 MessageChannel 不可用的环境下作为回退方案，使用标准的 `ipcMain`/`ipcRenderer`。

### 3. Fine-grained Permission Control / 细粒度权限控制

支持字段级别的权限设置，防止未授权的窗口修改关键数据。

- **ReadOnly**: 只读数据，任何窗口都无法修改。
- **AllowedWindows**: 指定只有特定的窗口才能修改某个字段。

### 4. Unified Communication Interface / 统一通信接口

提供统一的消息代理机制，所有操作（获取、设置、删除）都通过标准化的消息格式进行分发，无论底层使用何种传输方式。

## Architecture Design / 架构设计

`MessageBus` 采用了**发布-订阅 (Pub/Sub)** 和 **单一数据源 (Single Source of Truth)** 的混合架构。

```
      Main Process / 主进程                  Renderer Process / 渲染进程
┌─────────────────────────────┐          ┌──────────────────────┐
│         MessageBus          │          │       Window A       │
│      (Singleton Instance)   │          │ (MessagePort/IPC)    │
│                             │◄──Transport──┤                  │
│  ┌───────────────────────┐  │          │      Local Cache     │
│  │ DataStore (Map)       │  │          └──────────▲───────────┘
│  │ - key: value          │  │                     │
│  │ - permission          │  │                     │
│  └──────────▲────────────┘  │                     │
│             │               │          ┌──────────▼───────────┐
│  ┌──────────▼────────────┐  │          │       Window B       │
│  │ MessageDispatcher     │──┼─Broadcast│ (MessagePort/IPC)    │
│  └──────────┬────────────┘  │─────────►│                      │
│             │               │          │      Local Cache     │
│  ┌──────────▼────────────┐  │          └──────────────────────┘
│  │ Transport Layer       │  │
│  │ (IPC / MessagePort)   │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**Key Flow / 关键流程：**

1.  **Initialization**: 主进程选择传输策略（自动/MessagePort/IPC）。
2.  **Registration**: 窗口创建时，将其注册到传输层。
3.  **Data Modification**: 渲染进程通过 Transport 发送修改请求。
4.  **Auth & Update**: 主进程检查 `readonly` 和 `allowedWindows` 权限。如果通过，更新主进程的静态存储。
5.  **Broadcasting**: 主进程通过 Transport 将 `set` 事件广播给所有已注册的窗口。
6.  **Local Update**: 渲染进程收到广播后，更新本地的缓存（Cache），触发 UI 响应式更新。

## 内部架构 (Internal Architecture)

### 1. 数据存储结构 (DataStoreManager)

状态维护在一个带有权限元数据的简单 `Map` 结构中。

```typescript
// Data Structure
interface DataStoreItem {
  value: any;
  permission?: FieldPermission;
}

private dataStore: Map<string, DataStoreItem> = new Map();
```

#### 权限检查逻辑 (`checkPermission`)

在任何修改（`set` 或 `delete`）之前，会调用 `checkPermission` 方法：

1.  **只读检查 (ReadOnly Check)**：如果 `item.permission.readonly` 为 `true`，返回错误 `Field "key" is readonly`。
2.  **允许窗口检查 (AllowedWindows Check)**：如果设置了 `item.permission.allowedWindows`：
    -   检查请求的 `windowId` 是否在数组中。
    -   如果不在，返回错误 `Window "ID" is not allowed to modify "key"`。
3.  **通过 (Pass)**：如果所有检查通过，返回 `{ success: true }`。

### 2. 传输层抽象 (Transport Layer Abstraction)

`ITransport` 接口将通信机制与业务逻辑解耦。

- **MessagePortTransport**: 使用 `MessageChannelMain` 进行高性能直接通信。
- **IpcTransport**: 使用 `ipcMain` 和 `webContents.send` 以实现兼容性。

**自动回退 (Auto Fallback)**：系统默认为 'auto' 模式，优先使用 MessagePort，如果初始化失败则自动回退到 IPC。

### 3. 事务缓冲 (TransactionManager)

使用类似预写日志 (WAL) 的缓冲区确保多步骤操作的原子性。

```typescript
// Transaction Scope
private buffers = new Map<string, Map<string, TransactionOperation>>();
// windowId -> { key -> { type: 'set'|'delete', value?: any } }
```

#### 事务流程

1.  **开始 (`start`)**：在 `buffers` 中为特定 `windowId` 创建一个新的 `Map`。
2.  **缓冲 (`add`)**：如果有活跃事务，`setData` 和 `deleteData` 操作将写入此缓冲区而不是主 `DataStore`。
3.  **提交 (`commit`)**：
    -   检索该窗口的缓冲区。
    -   按顺序应用所有操作到 `DataStoreManager`。
    -   广播最终的状态变更。
    -   移除缓冲区。
4.  **回滚 (`rollback`)**：直接删除该窗口的缓冲区映射。

### 4. 订阅优化 (SubscriptionManager)

通过跟踪兴趣来优化带宽。

```typescript
// Interest Tracking
private subscriptions = new Map<string, Set<string>>(); // key -> Set<windowId>
```

## 渲染进程客户端使用指南

### 初始化

```typescript
import { MessageBusClient } from 'electron-infra-kit';

// 假设你已经在 preload 中接收到了端口
const client = new MessageBusClient(port);
```

### 订阅数据变化

```typescript
const unsubscribe = client.subscribe('theme', (newValue) => {
  console.log('主题变更:', newValue);
});

// 清理
unsubscribe();
```

### 读写数据

```typescript
// 设置数据
await client.set('user.name', 'John');

// 获取数据
const theme = await client.get('theme');

// 删除数据
await client.delete('tempData');
```

## Usage / 使用方法

### 1. Main Process Setup / 主进程配置

```typescript
import { app, BrowserWindow } from 'electron';
import { MessageBus } from 'electron-infra-kit';

// 1. Create Instance
// 1. 创建实例
// Options: { transportMode: 'auto' | 'ipc' | 'messageport' }
const messageBus = new MessageBus({ transportMode: 'auto' });

// 2. Initialize global state (Optional)
// 2. 初始化全局状态（可选）
messageBus.setData('appConfig', {
  theme: 'dark',
  version: '1.0.0',
});

// 3. Set Permissions (Optional)
// 3. 设置权限（可选）
messageBus.setFieldPermission('appConfig', { readonly: true });

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      preload: 'path/to/preload.js',
    },
  });

  // 4. Register Window
  // 4. 注册窗口
  // IMPORTANT: Must be called after window creation
  // 重要：必须在窗口创建后调用
  messageBus.registerWindow(win.id.toString(), win);
}

// 5. Initialize IPC Listener (Optional, allows invoke from renderer)
// 5. 初始化 IPC 监听器（可选，允许渲染进程通过 invoke 调用）
messageBus.initializeListener();
```

### 2. Preload Script / 预加载脚本

You need to receive the port in the preload script and expose APIs.
需要在预加载脚本中接收端口并暴露 API。

```typescript
import { ipcRenderer, contextBridge } from 'electron';

ipcRenderer.on('message-bus-port', (e) => {
  const port = e.ports[0];

  // Initialize your renderer-side bus handler here
  // 在这里初始化你的渲染进程侧桥接处理器
  // e.g., new MessageBusClient(port);
});
```

### 3. Transaction Management / 事务管理

Perform multiple data updates atomically.
原子地执行多个数据更新。

```typescript
// Start a transaction scope
// 开始一个事务范围
messageBus.startTransaction(windowId);

try {
  messageBus.setData('user.name', 'Alice', windowId);
  messageBus.setData('user.role', 'Admin', windowId);

  // All changes are applied and broadcasted together here
  // 所有更改在此处一起应用并广播
  messageBus.commitTransaction(windowId);
} catch (err) {
  // Revert changes if something goes wrong
  // 如果出错则回滚更改
  messageBus.rollbackTransaction(windowId);
}
```

## API Reference / API 参考

### `MessageBus` (Singleton / 单例)

#### `constructor(options: MessageBusOptions)`

Creates a new `MessageBus` instance.
创建新的 `MessageBus` 实例。
- `options.transportMode`: 'auto' (default), 'ipc', or 'messageport'.
- `options.eventName`: Custom event name.

#### `registerWindow(windowId: string, window: BrowserWindow): void`

Registers a window with the MessageBus using the configured transport strategy. This is critical to enable broadcasting.
使用配置的传输策略将窗口注册到 MessageBus。这是启用广播的关键步骤。

#### `unregisterWindow(windowId: string): void`

Unregisters a window and cleans up resources (subscriptions, transactions).
注销窗口并清理资源（订阅、事务）。

#### `autoRegisterWindows(windowManager: WindowManager): void`

Automatically registers/unregisters windows when they are created/destroyed by `WindowManager`.
当 `WindowManager` 创建/销毁窗口时，自动注册/注销窗口。

#### `getData(key?: string): any`

Retrieves data from the shared store. If `key` is omitted, returns the entire store object.
从共享存储中检索数据。如果省略 `key`，则返回整个存储对象。

#### `setData(key: string, value: any, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Updates a value in the shared store.
更新共享存储中的值。

- Checks permissions before updating. / 更新前会检查权限。
- Broadcasts changes to all registered windows. / 将变更广播给所有已注册的窗口。
- **Returns**: `{ success: boolean, error?: string }`.

#### `deleteData(key: string, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Removes a key from the shared store.
从共享存储中移除一个键。

#### `watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void`

Watches for data changes in the main process. Returns an unsubscribe function.
在主进程中监听数据变化。返回一个取消订阅函数。

```typescript
const unsubscribe = messageBus.watch('theme', (newValue, oldValue) => {
  console.log('Theme changed:', newValue);
});
// Later: unsubscribe();
```

#### `subscribe(windowId: string, keys: string[]): void`

Subscribes the specified window to updates for specific data keys.
为指定窗口订阅特定数据键的更新。

#### `unsubscribe(windowId: string, keys: string[]): void`

Unsubscribes the specified window from updates for specific data keys.
取消指定窗口对特定数据键的更新订阅。

#### `setFieldPermission(key: string, permission: FieldPermission): void`

Sets permission rules for a specific data field.
为特定数据字段设置权限规则。

```typescript
interface FieldPermission {
  readonly?: boolean;
  allowedWindows?: string[]; // List of window IDs allowed to write / 允许写入的窗口 ID 列表
}
```

#### `sendToWindow(targetWinId: string, channel: string, data: any): boolean`

Sends a direct message to a specific window.
向指定窗口发送直接消息。

#### `startTransaction(windowId: string): void`

Starts a transaction scope for the specified window.
为指定窗口开始一个事务范围。

#### `commitTransaction(windowId: string): void`

Commits all pending changes in the transaction scope and broadcasts them atomically.
提交事务范围内的所有待处理更改，并原子地广播它们。

#### `rollbackTransaction(windowId: string): void`

Discards all pending changes in the transaction scope.
丢弃事务范围内的所有待处理更改。

#### `updateData(key: string, updater: (oldValue: any) => any, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Atomically updates a value using an updater function.
使用更新函数原子地更新值。

#### `on(event: 'error', listener: (error: Error) => void): this`

Listens for errors, including port disconnection or transmission failures.
监听错误，包括端口断开连接或传输失败。

#### `dispose(): void`

Closes all ports and clears resources.
关闭所有端口并清理资源。
