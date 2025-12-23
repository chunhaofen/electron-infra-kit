# Preload Module / 预加载模块

The `preload` module provides a secure and easy-to-use bridge for IPC communication in the Electron renderer process. It is built on top of `contextBridge` to ensure security best practices.

`preload` 模块为 Electron 渲染进程提供了安全且易于使用的 IPC 通信桥接。它基于 `contextBridge` 构建，确保符合安全最佳实践。

## Features / 特性

- **Secure by Default / 默认安全**: Uses `contextBridge` to expose APIs, preventing context isolation bypass.
  - 使用 `contextBridge` 暴露 API，防止上下文隔离绕过。
- **Smart Unwrapping / 智能解包**: Automatically handles standardized response format (`{ code, message, data }`).
  - 自动处理标准化响应格式（`{ code, message, data }`）。
  - Returns `data` directly on success, throws Error on failure.
  - 成功时直接返回 `data`，失败时抛出错误。
- **Lightweight / 轻量级**: Minimal footprint, focused on IPC essentials.
  - 占用极小，专注于 IPC 核心功能。
- **Type Safe / 类型安全**: Written in TypeScript with complete type definitions.
  - 使用 TypeScript 编写，提供完整的类型定义。
- **Configurable / 可配置**: Customizable IPC channel names to avoid conflicts.
  - 支持自定义 IPC 频道名称，避免冲突。

## Usage / 使用方法

### 1. Setup in Preload Script / 在预加载脚本中设置

In your `preload/index.ts` (or wherever your preload script resides):
在你的 `preload/index.ts`（或预加载脚本所在的任何位置）：

```typescript
import { IpcRendererBridge } from 'electron-infra-kit/preload';

// Create instance
// 创建实例
const ipcRendererBridge = new IpcRendererBridge();

// Option A: Auto-expose using the helper
// 选项 A：使用辅助方法自动暴露
ipcRendererBridge.exposeApi("ipcApi"); // window.ipcApi will be available

// Option B: Manual exposure (for more control)
// 选项 B：手动暴露（用于更多控制）
import { contextBridge } from "electron";
const bindings = ipcRendererBridge.getBindings();

contextBridge.exposeInMainWorld("myApi", {
  ...bindings,
  // Add other custom APIs here
  // 在这里添加其他自定义 API
  version: process.versions.electron,
});
```

### 2. Usage in Renderer Process / 在渲染进程中使用

Once exposed, you can use it in your renderer code (e.g., React, Vue, vanilla JS):
暴露后，你可以在渲染进程代码（如 React, Vue, 原生 JS）中使用它：

```typescript
// Define types for window (optional but recommended for TypeScript)
// 定义 window 的类型（可选，但推荐 TypeScript 使用）
declare global {
  interface Window {
    ipcApi: {
      invoke: <T = any>(channel: string, data?: any) => Promise<T>;
      sendSync: <T = any>(channel: string, data?: any) => T;
    };
  }
}

// Async invocation (Recommended)
// 异步调用（推荐）
async function fetchData() {
  try {
    // The bridge automatically unwraps the response.
    // If backend returns { code: 0, data: User }, result will be User.
    // 桥接器会自动解包响应。
    // 如果后端返回 { code: 0, data: User }，result 将会是 User。
    const result = await window.ipcApi.invoke("get-user-data", { id: 1 });
    console.log(result);
  } catch (error) {
    // If backend returns code != 0, an error is thrown with the message.
    // 如果后端返回 code != 0，会抛出带有错误消息的 Error。
    console.error("IPC Error:", error.message);
  }
}

// Synchronous invocation
// 同步调用
try {
  const config = window.ipcApi.sendSync("get-config");
  console.log(config);
} catch (error) {
  console.error("Sync Error:", error.message);
}
```

### Configuration / 配置

You can configure the IPC channel names if the defaults conflict with your existing setup.
如果默认的 IPC 频道名称与现有设置冲突，你可以进行配置。

```typescript
ipcRendererBridge.configure({
  channel: "my-app-async", // Default: 'renderer-to-main'
  syncChannel: "my-app-sync", // Default: 'renderer-to-main-sync'
});
```

## API Reference / API 参考

### `ipcRendererBridge`

The singleton instance of `IpcRendererBridge`.
`IpcRendererBridge` 的单例实例。

#### Methods / 方法

- **`configure(config: PreloadConfig): void`**

  - Updates the IPC channel names.
  - 更新 IPC 频道名称。

- **`getBindings(): IpcRendererBindings`**

  - Returns the object containing `invoke` and `sendSync` functions, ready to be exposed via `contextBridge`.
  - 返回包含 `invoke` 和 `sendSync` 函数的对象，准备通过 `contextBridge` 暴露。
  - **Auto-Unwrap**: The returned functions automatically unwrap `{ code, data }` responses.
  - **自动解包**: 返回的函数会自动解包 `{ code, data }` 响应。

- **`exposeApi(apiKey?: string): void`**
  - Helper to expose bindings to `window[apiKey]`. Default `apiKey` is `'ipcApi'`.
  - 将绑定暴露给 `window[apiKey]` 的辅助方法。默认 `apiKey` 为 `'ipcApi'`。
