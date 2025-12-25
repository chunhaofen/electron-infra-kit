# Preload Module

[English](./README.md) | [简体中文](./README.zh-CN.md)

The `preload` module provides a secure and easy-to-use bridge for IPC communication in the Electron renderer process. It is built on top of `contextBridge` to ensure security best practices.

## Features

- **Secure by Default**: Uses `contextBridge` to expose APIs, preventing context isolation bypass.
- **Smart Unwrapping**: Automatically handles standardized response format (`{ code, message, data }`). Returns `data` directly on success, throws Error on failure.
- **Lightweight**: Minimal footprint, focused on IPC essentials.
- **Type Safe**: Written in TypeScript with complete type definitions.
- **Configurable**: Customizable IPC channel names to avoid conflicts.

## Usage

### 1. Setup in Preload Script

In your `preload/index.ts`:

```typescript
import { IpcRendererBridge } from 'electron-infra-kit/preload';

// Create instance
const ipcRendererBridge = new IpcRendererBridge();

// Option A: Auto-expose using the helper
ipcRendererBridge.exposeApi("ipcApi"); // window.ipcApi will be available

// Option B: Manual exposure (for more control)
import { contextBridge } from "electron";
const bindings = ipcRendererBridge.getBindings();

contextBridge.exposeInMainWorld("myApi", {
  ...bindings,
  // Add other custom APIs here
  version: process.versions.electron,
});
```

### 2. Usage in Renderer Process

Once exposed, you can use it in your renderer code:

```typescript
// Define types for window (optional but recommended for TypeScript)
declare global {
  interface Window {
    ipcApi: {
      invoke: <T = any>(channel: string, data?: any) => Promise<T>;
      sendSync: <T = any>(channel: string, data?: any) => T;
    };
  }
}

// Async invocation (Recommended)
async function fetchData() {
  try {
    // The bridge automatically unwraps the response.
    // If backend returns { code: 200, data: User }, result will be User.
    const result = await window.ipcApi.invoke("get-user-data", { id: 1 });
    console.log(result);
  } catch (error) {
    // If backend returns code != 200, an error is thrown with the message.
    console.error("IPC Error:", error.message);
  }
}

// Synchronous invocation
try {
  const config = window.ipcApi.sendSync("get-config");
  console.log(config);
} catch (error) {
  console.error("Sync Error:", error.message);
}
```

### Configuration

You can configure the IPC channel names if the defaults conflict with your existing setup.

```typescript
ipcRendererBridge.configure({
  channel: "my-app-async", // Default: 'renderer-to-main'
  syncChannel: "my-app-sync", // Default: 'renderer-to-main-sync'
});
```

## API Reference

### `ipcRendererBridge`

The singleton instance of `IpcRendererBridge`.

#### Methods

- **`configure(config: PreloadConfig): void`**
  - Updates the IPC channel names.

- **`getBindings(): IpcRendererBindings`**
  - Returns the object containing `invoke` and `sendSync` functions, ready to be exposed via `contextBridge`.
  - **Auto-Unwrap**: The returned functions automatically unwrap `{ code, data }` responses.

- **`exposeApi(apiKey?: string): void`**
  - Helper to expose bindings to `window[apiKey]`. Default `apiKey` is `'ipcApi'`.
