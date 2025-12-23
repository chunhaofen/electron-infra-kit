# MessageBus Module

[English](./README.md) | [简体中文](./README.zh-CN.md)

`MessageBus` is a powerful, highly scalable multi-window state management and communication module designed for Electron applications. It solves the problems of inconsistent state and complex communication in traditional multi-window applications.

It supports multiple transport strategies (**MessageChannel** or **IPC**), implementing real-time data synchronization and communication between windows through shared state and event broadcasting, while providing flexible permission control mechanisms to ensure data security.

## Features

### 1. Real-time State Broadcasting

In multi-window applications, keeping data consistent across windows is a major challenge. `MessageBus` implements a **"Single Source of Truth"** model: any window modifying data causes the Bus to automatically **broadcast** the change to all other registered windows.

### 2. High Performance & Flexibility

- **Auto Transport Selection**: Automatically selects the best transport mechanism.
- **MessagePort Mode**: Based on `MessageChannelMain`, messages are passed directly between processes (zero-copy), which is more efficient.
- **IPC Mode**: Fallback for environments where MessageChannel is not available, using standard `ipcMain`/`ipcRenderer`.

### 3. Fine-grained Permission Control

Supports field-level permission settings to prevent unauthorized windows from modifying critical data.

- **ReadOnly**: Data is read-only and cannot be modified by any window.
- **AllowedWindows**: Specifies that only specific windows can modify a field.

### 4. Unified Communication Interface

Provides a unified message proxy mechanism where all operations (get, set, delete) are dispatched through a standardized message format, regardless of the underlying transport.

## Architecture Design

`MessageBus` adopts a hybrid architecture of **Pub/Sub** and **Single Source of Truth**.

```
      Main Process                          Renderer Process
┌─────────────────────────────┐          ┌──────────────────────┐
│         MessageBus          │          │       Window A       │
│      (Shared Instance)      │          │ (MessagePort/IPC)    │
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

**Key Flow:**

1. **Initialization**: Main process selects transport strategy (Auto/MessagePort/IPC).
2. **Registration**: When a window is created, it is registered with the Transport layer.
3. **Data Modification**: Renderer sends modification request via Transport.
4. **Auth & Update**: Main process checks `readonly` and `allowedWindows` permissions. If passed, updates the static store.
5. **Broadcasting**: Main process broadcasts the `set` event to all registered windows via Transport.
6. **Local Update**: Renderers receive broadcast, update local cache, and trigger UI reactive updates.

## Internal Architecture

### 1. DataStore Structure (DataStoreManager)

The state is maintained in a simple `Map` structure with permission metadata.

```typescript
// Data Structure
interface DataStoreItem {
  value: any;
  permission?: FieldPermission;
}

private dataStore: Map<string, DataStoreItem> = new Map();
```

#### Permission Check Logic (`checkPermission`)

Before any modification (`set` or `delete`), the `checkPermission` method is called:

1.  **ReadOnly Check**: If `item.permission.readonly` is `true`, return error `Field "key" is readonly`.
2.  **AllowedWindows Check**: If `item.permission.allowedWindows` is set:
    - Check if the requesting `windowId` is in the array.
    - If not, return error `Window "ID" is not allowed to modify "key"`.
3.  **Pass**: If all checks pass, return `{ success: true }`.

### 2. Transport Layer Abstraction

The `ITransport` interface decouples the communication mechanism from the business logic.

- **MessagePortTransport**: Uses `MessageChannelMain` for high-performance, direct communication.
- **IpcTransport**: Uses `ipcMain` and `webContents.send` for compatibility.

**Auto Fallback**: The system defaults to 'auto' mode, which prefers MessagePort but falls back to IPC if initialization fails.

### 3. Transaction Buffering (TransactionManager)

Ensures atomicity of multi-step operations using a Write-Ahead-Log (WAL) style buffer.

```typescript
// Transaction Scope
private buffers = new Map<string, Map<string, TransactionOperation>>();
// windowId -> { key -> { type: 'set'|'delete', value?: any } }
```

#### Transaction Flow

1.  **Start (`start`)**: Creates a new `Map` for the specific `windowId` in `buffers`.
2.  **Buffer (`add`)**: `setData` and `deleteData` operations write to this buffer instead of the main `DataStore` if a transaction is active.
3.  **Commit (`commit`)**:
    - Retrieves the buffer for the window.
    - Apply all operations to `DataStoreManager` sequentially.
    - Broadcasts the final state changes.
    - Remove the buffer.
4.  **Rollback (`rollback`)**: Simply deletes the buffer map for the window.

### 4. Subscription Optimization (SubscriptionManager)

Optimizes bandwidth by tracking interest.

```typescript
// Interest Tracking
private subscriptions = new Map<string, Set<string>>(); // key -> Set<windowId>
```

## Renderer Client Guide

### Initialization

```typescript
import { MessageBusClient } from 'electron-infra-kit';

// Assuming you have received the port via preload
const client = new MessageBusClient(port);
```

### Subscribing to Data Changes

```typescript
const unsubscribe = client.subscribe('theme', (newValue) => {
  console.log('Theme changed:', newValue);
});

// Cleanup
unsubscribe();
```

### Reading and Writing Data

```typescript
// Set Data
await client.set('user.name', 'John');

// Get Data
const theme = await client.get('theme');

// Delete Data
await client.delete('tempData');
```

## Usage

### 1. Main Process Setup

```typescript
import { app, BrowserWindow } from 'electron';
import { MessageBus } from 'electron-infra-kit';

// 1. Create Instance
// Options: { transportMode: 'auto' | 'ipc' | 'messageport' }
const messageBus = new MessageBus({ transportMode: 'auto' });

// 2. Initialize global state (Optional)
messageBus.setData('appConfig', {
  theme: 'dark',
  version: '1.0.0',
});

// 3. Set Permissions (Optional)
messageBus.setFieldPermission('appConfig', { readonly: true });

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      preload: 'path/to/preload.js',
    },
  });

  // 4. Register Window
  // IMPORTANT: Must be called after window creation
  messageBus.registerWindow(win.id.toString(), win);
}

// 5. Initialize IPC Listener (Optional, allows invoke from renderer)
messageBus.initializeListener();
```

### 2. Preload Script

You need to receive the port in the preload script and expose APIs.

```typescript
import { ipcRenderer, contextBridge } from 'electron';

ipcRenderer.on('message-bus-port', (e) => {
  const port = e.ports[0];

  // Initialize your renderer-side bus handler here
  // e.g., new MessageBusClient(port);
});
```

### 3. Transaction Management

Ensure data consistency across multiple operations.

```typescript
// Start a transaction scope
messageBus.startTransaction(windowId);

try {
  // These changes are buffered and not broadcasted yet
  messageBus.setData('user.name', 'John', windowId);
  messageBus.setData('user.role', 'Admin', windowId);

  // Commit all changes atomically
  messageBus.commitTransaction(windowId);
} catch (e) {
  // Revert all pending changes
  messageBus.rollbackTransaction(windowId);
}
```

## API Reference

### `MessageBus` (Singleton)

#### `constructor(options: MessageBusOptions)`

Creates a new `MessageBus` instance.

- `options.transportMode`: 'auto' (default), 'ipc', or 'messageport'.
- `options.eventName`: Custom event name.

#### `registerWindow(windowId: string, window: BrowserWindow): void`

Registers a window with the MessageBus using the configured transport strategy. This is critical to enable broadcasting.

#### `unregisterWindow(windowId: string): void`

Unregisters a window and cleans up resources (subscriptions, transactions).

#### `autoRegisterWindows(windowManager: WindowManager): void`

Automatically registers/unregisters windows when they are created/destroyed by `WindowManager`.

#### `getData(key?: string): any`

Retrieves data from the shared store. If `key` is omitted, returns the entire store object.

#### `setData(key: string, value: any, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Updates a value in the shared store.

- Checks permissions before updating.
- Broadcasts changes to all registered windows.
- **Returns**: `{ success: boolean, error?: string }`.

#### `deleteData(key: string, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Removes a key from the shared store.

#### `watch(key: string, callback: (newValue: any, oldValue: any) => void): () => void`

Watches for data changes in the main process. Returns an unsubscribe function.

```typescript
const unsubscribe = messageBus.watch('theme', (newValue, oldValue) => {
  console.log('Theme changed:', newValue);
});
// Later: unsubscribe();
```

#### `subscribe(windowId: string, keys: string[]): void`

Subscribes the specified window to updates for specific data keys.

#### `unsubscribe(windowId: string, keys: string[]): void`

Unsubscribes the specified window from updates for specific data keys.

#### `setFieldPermission(key: string, permission: FieldPermission): void`

Sets permission rules for a specific data field.

```typescript
interface FieldPermission {
  readonly?: boolean;
  allowedWindows?: string[]; // List of window IDs allowed to write
}
```

#### `sendToWindow(targetWinId: string, channel: string, data: any): boolean`

Sends a direct message to a specific window.

#### `startTransaction(windowId: string): void`

Starts a transaction scope for the specified window.

#### `commitTransaction(windowId: string): void`

Commits all pending changes in the transaction scope and broadcasts them atomically.

#### `rollbackTransaction(windowId: string): void`

Discards all pending changes in the transaction scope.

#### `updateData(key: string, updater: (oldValue: any) => any, windowId?: string, eventName?: string): { success: boolean; error?: string }`

Atomically updates a value using an updater function.

#### `on(event: 'error', listener: (error: Error) => void): this`

Listens for errors, including port disconnection or transmission failures.

#### `dispose(): void`

Closes all ports and clears resources.
