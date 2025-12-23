# WindowManager Module

[English](./README.md) | [简体中文](./README.zh-CN.md)

`WindowManager` is a high-cohesion Electron window management module designed to solve the problem that the native `BrowserWindow` API is too low-level and lacks a unified management mechanism. It provides a window registry, duplicate creation prevention, environment-aware configuration, and graceful lifecycle management.

## Features

### 1. Global Window Registry

Built-in `WindowStore` maintains a static registry of `Map<windowId, BrowserWindow>`.

- **Benefit**: You can instantly find a target window by ID or Name anywhere in your app (including IPC Handlers, Menu callbacks, Tray events) without maintaining fragile arrays yourself.

### 2. Singleton Window Assurance

When you try to create an existing window, the `create` method automatically executes a **"Find & Focus"** strategy:

1. Checks if the window exists.
2. If minimized, automatically restores it.
3. Brings the window to front and focuses it.
4. **Does NOT** create a duplicate window instance.

### 3. Environment Awareness

Automatically identifies `IS_DEV` status:

- **Development**: Automatically opens DevTools.
- **Production**: Enforces DevTools disabled, disables unsafe link navigation (intercepts `new-window` events and opens in external browser by default).

### 4. Graceful Lifecycle

Automatically handles window creation, display, hiding, and closing lifecycle events:

- Automatically registers to the global registry upon creation.
- Automatically cleans up from the registry upon closing.
- Provides full event hooks for extending custom logic.

### 5. Decoupled IPC Integration

Supports optional IPC integration via **Dependency Injection**:

- **Flexible Setup**: Pass IPC setup logic via `ipcSetup` config.
- **Unified Entry**: Defaults to `renderer-to-main` (async) and `renderer-to-main-sync` (sync) channels when using default setup.
- **Command Dispatch**: Dispatches business logic via injected `IpcRouter`.

### 6. State Persistence

Built-in support for saving and restoring window states (position, size, maximization, full-screen).

- Automatically saves window state on move/resize/close.
- Automatically restores state when recreating the window.

### 7. Plugin System

Standardized plugin interface allowing external extensions to interact with the window manager.

- **Initialization**: Plugins can access the `WindowManager` instance on init.
- **Interception**: Plugins can intercept window creation (`onWillCreate`) to modify config or cancel creation.
- **Lifecycle**: Plugins receive notifications for window creation and destruction.

### 8. Lifecycle Hooks

Fine-grained control over window lifecycle events.

- **onWillCreate**: Triggered before window creation. Can modify config or cancel.
- **onDidCreate**: Triggered after window is created and registered.
- **onWillDestroy**: Triggered before window is closed.
- **onDidDestroy**: Triggered after window is closed and unregistered.

## Architecture Design

`WindowManager` adopts a **Composition** and **Modular** design pattern, ensuring separation of concerns and maintainability.

```
                                  ┌───────────────────┐
                                  │   WindowStore     │
                                  │   (Core Facade)   │
                                  └─────────┬─────────┘
                                            │
           ┌────────────────┬───────────────┼─────────────────┐
           ▼                ▼               ▼                 ▼
    ┌────────────┐   ┌────────────┐  ┌──────────────┐  ┌──────────────┐
    │  Registry  │   │  Operator  │  │ StateManager │  │ ContextMgr   │
    │ (Storage)  │   │ (Actions)  │  │ (Persistence)│  │ (Ctx Data)   │
    └────────────┘   └────────────┘  └──────────────┘  └──────────────┘

                                            ▲
                                            │ composes
                                            │
                                  ┌─────────┴─────────┐
                                  │   WindowManager   │
                                  │ (High-Level API)  │
                                  └─────────┬─────────┘
                                            │
                                            ▼
                                     ┌──────────────┐
                                     │   Plugins    │
                                     │ & Lifecycle  │
                                     └──────────────┘
```

**Responsibilities:**

1. **`WindowStore` (Core Facade)**
   - Acts as the central coordinator for all window management operations.
   - Delegates specific tasks to specialized core modules.

   **Core Modules:**
   - **`WindowRegistry`**: Manages the storage map (`Map<ID, Win>`) and handles cleanup of destroyed windows.
   - **`WindowOperator`**: Encapsulates window actions (show, hide, minimize, maximize) and safety checks.
   - **`WindowStateManager`**: Handles persistence of window UI state (position, size, maximization).
   - **`WindowContextManager`**: Manages custom context data associated with windows.

2. **`WindowManager` (High-Level Control)**
   - Composes `WindowStore` to provide a unified API.
   - Adds application-level features: Plugin system, Lifecycle hooks, IPC setup.

3. **`Plugins & Lifecycle` (Extension)**
   - Allows external code to hook into window creation and destruction events.
   - Supports modular extensions via the `use()` method.

## Internal Architecture

`WindowStore` adopts a **Component-Based Facade Pattern**, delegating specific responsibilities to internal sub-managers while providing a unified API.

### Component Overview

- **WindowRegistry**: Manages storage, ID/Name mapping, and group relationships. It maintains bidirectional indexes for efficient lookups.
- **WindowOperator**: Encapsulates all `BrowserWindow` operations (show, hide, close) with safety checks (e.g., `!isDestroyed()`).
- **WindowContextManager**: Handles persistence of arbitrary window context data (JSON-serializable).
- **WindowStateManager**: Manages UI state persistence (position, size, maximized state).

### Focus History Management

The `WindowStore` maintains a **Focus Stack** to track window activation history, enabling "Restore Previous Window" functionality.

- **Stack Logic**:
  - `pushFocus(id)`: Moves the window ID to the top of the stack (removes duplicates).
  - `popFocus()`: Removes the top window ID.
  - `getPreviousFocusedWindow()`: Returns the second-to-last item in the stack (since the last one is the current active window).

### Window Group Management

Efficient group management is achieved through **Bidirectional Indexing**:

1. **Forward Index**: `Map<groupName, Set<windowId>>` - Quickly find all windows in a group.
2. **Reverse Index**: `Map<windowId, Set<groupName>>` - Quickly find all groups a window belongs to (crucial for cleanup).

When a window is closed, the reverse index allows O(1) removal from all associated groups.

### Cleanup Protection

To prevent memory leaks from "Ghost Windows" (windows destroyed by user/OS but still in registry):

- **Periodic Check**: Runs every 30s (configurable).
- **Chunked Processing**: Checks 50 windows per tick to avoid blocking the event loop in massive multi-window apps.

## Best Practices

## Usage

### 1. Basic Setup

```typescript
import { app } from 'electron';
import { WindowManager, IpcRouter } from 'electron-infra-kit';

// 1. Create IpcRouter
const ipcRouter = new IpcRouter();

// 2. Create WindowManager
const windowManager = new WindowManager({
  defaultConfig: {
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  },
  // Auto-connect IPC
  ipc: {
    autoInit: true,
  },
  ipcRouter,
  enablePersistence: true,
});

app.whenReady().then(async () => {
  // Ensure WindowManager is fully initialized
  await windowManager.ready();

  await windowManager.create({
    name: 'main-window',
    url: 'https://google.com',
  });
});
```

### 2. Creating Windows

```typescript
windowManager.create({
  name: 'settings',
  width: 500,
  height: 400,
  defaultConfig: {
    resizable: false,
  },
});
```

### 3. Managing Windows

```typescript
// Get window by name
const mainWin = windowManager.getWindowByName('main-window');

// Check if window exists
if (windowManager.hasByName('settings')) {
  windowManager.deleteByName('settings');
}

// Get all windows
const allWindows = windowManager.getAllWindows();
```

### 4. Using Plugins & Hooks

```typescript
const LoggerPlugin = {
  name: 'Logger',
  onWillCreate(config) {
    console.log('Creating window:', config.name);
    return config;
  },
  onDidCreate({ name, id }) {
    console.log('Created window:', name, id);
  },
};

const wm = new WindowManager({
  plugins: [LoggerPlugin],
  hooks: {
    onWillDestroy: (id) => console.log('Destroying:', id),
  },
});

wm.use({
  name: 'Guard',
  onWillCreate(config) {
    if (config.name === 'forbidden') return false;
  },
});
```

### 5. Window Groups

Organize related windows into groups for batch operations.

```typescript
// Join a group
windowManager.joinGroup(windowId, 'editor-windows');

// Get all windows in a group
const editors = windowManager.getGroup('editor-windows');

// Send message to all windows in a group
windowManager.sendToGroup('editor-windows', 'theme-update', { theme: 'dark' });

// Batch operations
windowManager.hideGroup('editor-windows');
windowManager.showGroup('editor-windows');
await windowManager.closeGroup('editor-windows');
```

### 6. Crash Recovery

The `WindowManager` automatically handles window crashes and unresponsiveness.

```typescript
// Custom handling via events
windowManager.on('window-crash', ({ windowId, reason, exitCode }) => {
  console.error(`Window ${windowId} crashed: ${reason}`);
  // Default behavior: attempts to reload if reason is 'crashed' or 'oom'
});

windowManager.on('window-unresponsive', ({ windowId }) => {
  console.warn(`Window ${windowId} is unresponsive`);
  // You might want to show a dialog to the user
});
```

### 7. Focus Management

Manage window focus history and navigation.

```typescript
// Focus a specific window
windowManager.focus(windowId);

// Focus the previous window in history (useful when closing a modal)
windowManager.focusPrevious();

// Get focus history
const history = windowManager.getFocusHistory();
```

### 8. Resource Disposal

Properly release resources when shutting down the application.

```typescript
app.on('before-quit', () => {
  // Closes all windows, clears registry, and stops cleanup timers
  windowManager.dispose();
});
```

### 9. Context Management

Save and restore custom context data associated with windows (e.g., last view, scroll position).

```typescript
// Save window context
await windowManager.saveWindowContext('main-window', {
  bounds: { x: 100, y: 100, width: 800, height: 600 },
  lastView: 'dashboard',
});

// Load window context
const context = await windowManager.loadWindowContext('main-window');
if (context) {
  // Restore state
}

// Clear context
await windowManager.clearWindowContext('temp-window');
```

### 10. Cleanup Protection

Periodically check and clean up unresponsive windows or zombie processes.

```typescript
// Start cleanup protection (check every 60s)
windowManager.startCleanupProtection(60000);

// Stop protection
app.on('before-quit', () => {
  windowManager.stopCleanupProtection();
});
```

## API Reference

### `WindowManager`

Inherits from `WindowStore`.

#### `create(config: WindowCreationOptions): Promise<string>`

Creates a new window or restores an existing one. Returns a Promise that resolves to the window ID.

- `config.name`: Unique name for the window.
- `config.windowId`: Optional specific ID.
- `config.enablePersistence`: Override global persistence setting.
- `config.defaultConfig`: Override default window options.

#### `ready(): Promise<void>`

Waits for the WindowManager to be fully initialized (e.g., loading state from disk, initializing plugins).

#### `setupIPC(options?: { channel?: string; syncChannel?: string }): void`

Manually sets up IPC listeners if `autoInit` was false.

#### `use(plugin: WindowManagerPlugin): this`

Registers a new plugin dynamically.

#### `getWindowByName(name: string): BrowserWindow | undefined`

Retrieves a `BrowserWindow` instance by its semantic name.

#### `hasByName(name: string): boolean`

Checks if a window with the given name exists.

#### `deleteByName(name: string): boolean`

Closes and removes the window with the given name.

#### `getAllWindows(): BrowserWindow[]`

Returns an array of all managed `BrowserWindow` instances.

#### `getCurrentWindow(): BrowserWindow | undefined`

Returns the currently focused window or the main window.

#### `joinGroup(windowId: string, group: string): void`

Adds a window to a named group.

#### `getGroup(group: string): BrowserWindow[]`

Retrieves all windows in a specific group.

#### `sendToGroup(group: string, channel: string, data: any): number`

Sends a message via `webContents.send` to all windows in a group. Returns the number of windows sent to.

#### `hideGroup(group: string): void`

Hides all windows in a group.

#### `showGroup(group: string): void`

Shows all windows in a group.

#### `closeGroup(group: string): Promise<void>`

Closes all windows in a group.

#### `focus(windowId: string): boolean`

Focuses a specific window. Returns true if successful.

#### `focusPrevious(): boolean`

Focuses the previously active window in the history stack.

#### `getFocusHistory(): string[]`

Returns the window ID focus history stack.

#### `on(event: 'window-crash', listener: (data: { windowId: string; reason: string; exitCode?: number; name?: string; willReload: boolean }) => void): this`

Listens for window crash events.

#### `on(event: 'window-unresponsive', listener: (data: { windowId: string; name?: string }) => void): this`

Listens for window unresponsive events.

#### `saveWindowContext(windowId: string, context: any): Promise<void>`

Saves custom context data for a window.

#### `loadWindowContext(windowId: string): Promise<any>`

Loads saved context data for a window.

#### `clearWindowContext(windowId: string): Promise<void>`

Clears saved context data for a window.

#### `startCleanupProtection(intervalMs?: number): void`

Starts the periodic cleanup task to detect and remove unresponsive windows. Default interval is 30000ms.

#### `stopCleanupProtection(): void`

Stops the cleanup protection task.

#### `dispose(): void`

Releases all resources, closes all windows, and clears storage.
