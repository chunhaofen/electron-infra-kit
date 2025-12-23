# IPC Transport Module

> **Note**: This is an internal module used by `IpcRouter` and `WindowManager`. It is not exported from the main package entry point.

[English](./README.md) | [简体中文](./README.zh-CN.md)

The `ipc-transport` module is a robust wrapper around Electron's native `ipcMain`. It enhances IPC communication with built-in logging, standardized error handling, and resource management.

It serves as the low-level transport layer and is typically used by `IpcRouter` or `WindowManager` rather than directly.

## Features

- **Standardized Response**: Automatically wraps return values into a standard structure: `{ code: number, message: string, data: T }`.

- **Automatic Logging**: Automatically logs parameters for all communication events. Prioritizes logging the `name` field (Action Name) if present in the arguments.

- **Error Handling**: Business logic exceptions in `handle` methods are automatically caught and logged. Exceptions are converted to `{ code: 500, message: error.message }` responses.

- **Duplicate Prevention**: Automatically detects and cleans up duplicate handlers. Avoids Electron's "second handler" error.

- **Resource Management**: Provides fine-grained control over listeners and handlers. Supports multi-instance management (non-singleton).

## Usage

```typescript
import IpcTransport from '@/core/ipc/transport';

// 1. Create an instance
const ipcTransport = new IpcTransport();

// 2. Register invoke/handle handler (Async)
ipcTransport.handle('my-channel', async (event, data) => {
  console.log('Received Request:', data);
  return { success: true };
  // Result in Renderer: { code: 0, message: "success", data: { success: true } }
});

// 3. Register send/on listener (Sync/Async)
ipcTransport.on('my-sync-channel', (event, data) => {
  console.log('Received Message:', data);
});

// 4. Remove handler
ipcTransport.removeHandler('my-channel');
```

### Log Format

The module generates logs in the following format for easier debugging:

- **Standard Call**: `[INFO] [HANDLE] my-channel [Action: get-user]`
- **Detailed Args**: `[INFO] [HANDLE] my-channel [Args: [{"id": 1}]]`
- **Error Log**: `[ERROR] [HANDLE ERROR] my-channel: Database connection failed`

## API Reference

### `IpcTransport`

The class for managing IPC communications.

#### Methods

- **`constructor(logger?: ILogger)`** - Creates a new instance.

- **`on(channel: string, cb: IPCEventHandler): void`** - Registers an event listener (wrapper for `ipcMain.on`).

- **`handle(channel: string, cb: IPCHandleHandler): void`** - Registers a handler (wrapper for `ipcMain.handle`). **Wraps return value** in `IpcResponse`.

- **`removeListener(channel: string, cb?: IPCEventHandler): void`** - Removes listeners for a specific channel.

- **`removeAllListeners(channel?: string): void`** - Removes all listeners or listeners for a specific channel.

- **`removeHandler(channel: string): void`** - Removes the handler for a specific channel.

- **`removeAllHandlers(): void`** - Removes all handlers.
