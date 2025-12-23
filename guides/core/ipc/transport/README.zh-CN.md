# IPC Transport Module / IPC 传输模块

> **注意**：这是一个内部模块，主要供 `IpcRouter` 和 `WindowManager` 使用。它并未从主包入口点导出。

[English](./README.md) | [简体中文](./README.zh-CN.md)

The `ipc-transport` module is a robust wrapper around Electron's native `ipcMain`. It enhances IPC communication with built-in logging, standardized error handling, and resource management.

`ipc-transport` 模块是对 Electron 原生 `ipcMain` 的健壮封装。它通过内置的日志记录、标准化的错误处理和资源管理增强了 IPC 通信。

It serves as the low-level transport layer and is typically used by `IpcRouter` or `WindowManager` rather than directly.

它是底层的传输层实现，通常由 `IpcRouter` 或 `WindowManager` 调用，而不是直接使用。

## Features / 特性

- **Standardized Response / 标准化响应**:
  Automatically wraps return values into a standard structure: `{ code: number, message: string, data: T }`.
  自动将返回值封装为标准结构：`{ code: number, message: string, data: T }`。

- **Automatic Logging / 自动日志记录**: Automatically logs parameters for all communication events.
  - 自动记录所有通信事件的参数。
  - Prioritizes logging the `name` field (Action Name) if present in the arguments.
  - 如果参数中包含 `name` 字段，会优先记录 Action Name。

- **Error Handling / 错误自动捕获**: Business logic exceptions in `handle` methods are automatically caught and logged.
  - `handle` 方法中的业务异常会被自动捕获并记录错误日志。
  - Exceptions are converted to `{ code: 500, message: error.message }` responses.
  - 异常会被转换为 `{ code: 500, message: error.message }` 响应。

- **Duplicate Prevention / 防止重复注册**: Automatically detects and cleans up duplicate handlers.
  - 自动检测并清理重复注册的 Handler。
  - Avoids Electron's "second handler" error.
  - 避免 Electron 抛出 "second handler" 错误。

- **Resource Management / 资源管理**: Provides fine-grained control over listeners and handlers.
  - 提供对监听器和处理器的细粒度控制。
  - Supports multi-instance management (non-singleton).
  - 支持多实例管理（非单例）。

## Usage / 使用方法

```typescript
import IpcTransport from "@/core/ipc/transport";

// 1. Create an instance
// 1. 创建实例
const ipcTransport = new IpcTransport();

// 2. Register invoke/handle handler (Async)
// 2. 注册 invoke/handle 处理器 (异步)
ipcTransport.handle("my-channel", async (event, data) => {
  console.log("Received Request / 收到请求:", data);
  // Return raw data, it will be wrapped automatically
  // 返回原始数据，它会被自动封装
  return { success: true }; 
  // Result in Renderer: { code: 0, message: "success", data: { success: true } }
});

// 3. Register send/on listener (Sync/Async)
// 3. 注册 send/on 监听器 (同步/异步)
ipcTransport.on("my-sync-channel", (event, data) => {
  console.log("Received Message / 收到消息:", data);
});

// 4. Remove handler
// 4. 移除处理器
ipcTransport.removeHandler("my-channel");
```

### Log Format / 日志格式

The module generates logs in the following format for easier debugging:
模块会自动生成如下格式的日志，方便排查问题：

- **Standard Call / 普通调用**: `[INFO] [HANDLE] my-channel [Action: get-user]`
- **Detailed Args / 详细参数**: `[INFO] [HANDLE] my-channel [Args: [{"id": 1}]]`
- **Error Log / 错误日志**: `[ERROR] [HANDLE ERROR] my-channel: Database connection failed`

## API Reference / API 参考

### `IpcTransport`

The class for managing IPC communications.
用于管理 IPC 通信的类。

#### Methods / 方法

- **`constructor(logger?: ILogger)`**
  - Creates a new instance.
  - 创建新实例。

- **`on(channel: string, cb: IPCEventHandler): void`**
  - Registers an event listener (wrapper for `ipcMain.on`).
  - 注册监听事件 (对应 `ipcMain.on`)。

- **`handle(channel: string, cb: IPCHandleHandler): void`**
  - Registers a handler (wrapper for `ipcMain.handle`).
  - 注册处理事件 (对应 `ipcMain.handle`)。
  - **Wraps return value** in `IpcResponse`.
  - **封装返回值**为 `IpcResponse`。

- **`removeListener(channel: string, cb?: IPCEventHandler): void`**
  - Removes listeners for a specific channel.
  - 移除指定频道的监听器。

- **`removeAllListeners(channel?: string): void`**
  - Removes all listeners or listeners for a specific channel.
  - 移除所有监听器或指定频道的监听器。

- **`removeHandler(channel: string): void`**
  - Removes the handler for a specific channel.
  - 移除指定频道的处理器。

- **`removeAllHandlers(): void`**
  - Removes all handlers.
  - 移除所有处理器。
