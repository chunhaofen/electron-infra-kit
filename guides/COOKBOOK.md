# Electron Infra Kit Cookbook

This cookbook provides practical, real-world examples for integrating `electron-infra-kit` into your Electron application.

> **Note**
>
> - This cookbook assumes you have already followed the **Quick Start** guide (see [Quick Start](../README.md#quick-start) in README) and have a minimal Electron app running with the kit wired in.
> - It does **not** repeat project setup or directory structure, and instead focuses on **scenario-based patterns** (multi-window management, type-safe IPC, global state sync, etc.).
> - You should also be familiar with basic Electron concepts (Main Process, Preload, Renderer).

## Table of Contents

1. [Manual Integration (Non-Scaffold)](#1-manual-integration-non-scaffold)
2. [Preload & Renderer Setup](#2-preload--renderer-setup)
3. [Multi-Window Workspace with State Restoration](#3-multi-window-workspace-with-state-restoration)
4. [Type-Safe IPC with Zod Schemas](#4-type-safe-ipc-with-zod-schemas)
5. [Global State Synchronization](#5-global-state-synchronization)
6. [Writing Custom Plugins](#6-writing-custom-plugins)
7. [Advanced: Custom IPC Transport](#7-advanced-custom-ipc-transport)
8. [Handling Window Crashes](#8-handling-window-crashes)
9. [Debugging & Performance](#9-debugging--performance)
10. [Operational Notes](#10-operational-notes)

---

## 1. Manual Integration (Non-Scaffold)

If you have an existing project and don't want to use `createElectronToolkit`, here is how to manually wire everything up in your Main process.

```typescript
// src/main/index.ts
import { app } from 'electron';
import { WindowManager, IpcRouter, MessageBus, getSharedLogger } from 'electron-infra-kit';

// 1. Create Logger (shared singleton with IPC transport)
const logger = getSharedLogger({ appName: 'Main', ipcEnabled: true, ipcLevel: 'info' });

// 2. Initialize Core Services
const ipcRouter = new IpcRouter({ logger });
const messageBus = new MessageBus({ logger });

// 3. Initialize WindowManager with explicit IPC Setup
const windowManager = new WindowManager({
  // Inject dependencies
  ipcRouter,
  messageBus,
  logger,
  // Define your window defaults
  defaultConfig: {
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: 'path/to/preload.js', // IMPORTANT
    },
  },
  // Auto-connect IPC
  ipc: {
    autoInit: true,
  },
});

// 4. Connect MessageBus to WindowManager (Auto-registration)
messageBus.autoRegisterWindows(windowManager);

// Alternatively, manual registration:
// windowManager.on('window-created', ({ window, id }) => {
//   messageBus.registerWindow(id, window);
// });
// windowManager.on('window-will-be-destroyed', (id) => {
//   messageBus.unregisterWindow(id);
// });

app.whenReady().then(async () => {
  // 5. Setup IPC is handled automatically by ipc.autoInit: true
  // windowManager.setupIPC();

  // 6. Ensure initialization is complete
  await windowManager.ready();

  // 7. Create your first window
  windowManager.create({ name: 'main' });
});
```

---

## 2. Preload & Renderer Setup

To enable secure communication and state synchronization, you need to configure the Preload script correctly.

### Preload Script (`preload.ts`)

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit';

// 1. Create instance
const ipcRendererBridge = new IpcRendererBridge();

// 2. Expose the IPC API
// This allows `window.ipcApi.invoke()` in renderer
ipcRendererBridge.exposeApi('ipcApi');

// 3. Setup MessageBus Connection
// This automatically handles the "message-bus-port" message from the main process
setupMessageBus();
```

### Renderer Integration (`renderer.ts`)

```typescript
import { MessageBusClient } from 'electron-infra-kit';

// 1. Initialize Client
const busClient = new MessageBusClient();

// 2. Subscribe to global state changes
// Returns an unsubscribe function
const unsubscribe = busClient.subscribe('theme', (value) => {
  console.log('Theme changed:', value);
  document.body.className = value;
});

// 3. Call IPC
async function getUser() {
  try {
    const user = await window.ipcApi.invoke('renderer-to-main', {
      name: 'getUser',
      payload: { id: 1 },
    });
    console.log(user);
  } catch (error) {
    console.error('IPC Failed:', error);
  }
}
```

---

## 3. Multi-Window Workspace with State Restoration

Open multiple windows and have them appear exactly where they left off.

```typescript
// In Main Process
const windowManager = new WindowManager({
  // ... config
});

// Define a workspace layout
const workspace = [
  { name: 'dashboard', url: 'page/dashboard.html', x: 0, y: 0, w: 800, h: 600 },
  { name: 'chat', url: 'page/chat.html', x: 800, y: 0, w: 400, h: 600 },
];

function restoreWorkspace() {
  // Ensure WindowManager is ready before restoring
  windowManager.ready().then(() => {
    workspace.forEach((winDef) => {
      // 'enablePersistence: true' will automatically save/restore
      // position and size based on the 'name'
      windowManager.create({
        name: winDef.name,
        loadUrl: winDef.url, // Changed from url to loadUrl to match API
        width: winDef.w,
        height: winDef.h,
        x: winDef.x,
        y: winDef.y,
        enablePersistence: true,
      });
    });
  });
}
```

---

## 4. Type-Safe IPC with Zod Schemas

Define strict contracts for your IPC handlers.

```typescript
// shared/schema.ts
import { z } from 'zod';

export const LoginSchema = {
  payload: z.object({
    username: z.string().email(),
    password: z.string().min(6),
  }),
  response: z.object({
    token: z.string(),
    user: z.object({ id: z.string(), name: z.string() }),
  }),
};
```

```typescript
// main/handlers.ts
import { IpcHandler } from 'electron-infra-kit';
import { LoginSchema } from '../shared/schema';

const loginHandler = new IpcHandler(
  'login', // Handler ID
  'auth/login', // Event Name (if using events) or just internal ID
  async (context, payload) => {
    // 'payload' is automatically inferred as { username, password }
    // and VALIDATED at runtime before reaching here!

    const { username, password } = payload;
    // const token = await authService.login(username, password);
    const token = 'dummy-token';

    return {
      token,
      user: { id: '1', name: 'User' },
    };
  },
  LoginSchema.payload // Bind schema manually
);

// Register handler
ipcRouter.addHandler(loginHandler);
```

---

## 5. Global State Synchronization

Sync a "Dark Mode" setting across all open windows instantly.

```typescript
// Main Process
const messageBus = new MessageBus();

// Initialize state
messageBus.setData('theme', 'light');

// Allow all windows to read/write 'theme'
messageBus.setFieldPermission('theme', {
  readonly: false,
  // allowedWindows: ['*'] // Optional: restrict to specific windows
});
```

```typescript
// Renderer (Window A)
// User clicks "Toggle Theme"
const port = getMessageBusPort(); // (See Section 2)
port.postMessage(
  JSON.stringify({
    type: 'set',
    key: 'theme',
    value: 'dark',
  })
);
```

```typescript
// Renderer (Window B)
// Automatically receives update
port.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.key === 'theme') {
    applyTheme(msg.value); // Switches to dark mode immediately
  }
};
```

---

## 6. Writing Custom Plugins

You can extend `WindowManager` behavior by creating custom plugins. A plugin is simply an object (or class instance) that implements the `WindowManagerPlugin` interface.

```typescript
import { WindowManagerPlugin, WindowCreationOptions } from 'electron-infra-kit';

class MyAnalyticsPlugin implements WindowManagerPlugin {
  name = 'MyAnalyticsPlugin';

  // Called when plugin is registered
  onInit(wm) {
    console.log('Analytics plugin initialized');
  }

  // Intercept window creation
  onWillCreate(config: WindowCreationOptions) {
    console.log(`Preparing to create window: ${config.name}`);
    // You can modify config here, or return false to cancel creation
    return {
      ...config,
      backgroundColor: '#000000', // Force dark background
    };
  }

  // Called after window is created
  onDidCreate({ window, name }) {
    console.log(`Window ${name} created with ID ${window.id}`);
    // Track window open event
    // analytics.track('window_open', { name });
  }

  // Called when window is closed
  onDidDestroy(windowId) {
    console.log(`Window ${windowId} closed`);
  }
}

// Usage
windowManager.use(new MyAnalyticsPlugin());
```

---

## 7. Advanced: Custom IPC Transport

By default, `IpcRouter` uses the internal `IpcTransport` which wraps `ipcMain`. You can provide a custom transport to intercept, log, or mock IPC messages.

```typescript
import { IIpcTransport } from 'electron-infra-kit';
import { ipcMain } from 'electron';

class CustomIpcTransport implements IIpcTransport {
  handle(channel: string, listener: (event: any, ...args: any[]) => Promise<any>) {
    ipcMain.handle(channel, async (event, ...args) => {
      console.log(`[IPC Audit] Call to ${channel}`, args);
      try {
        const result = await listener(event, ...args);
        return { code: 0, data: result };
      } catch (err) {
        console.error(`[IPC Audit] Error in ${channel}`, err);
        return { code: 500, message: err.message };
      }
    });
  }

  // Implement other methods: on, removeHandler, etc.
  on(channel, listener) {
    ipcMain.on(channel, listener);
  }
  removeHandler(channel) {
    ipcMain.removeHandler(channel);
  }
  removeAllListeners(channel) {
    ipcMain.removeAllListeners(channel);
  }
  removeListener(channel, listener) {
    ipcMain.removeListener(channel, listener);
  }
}

// Usage
const windowManager = new WindowManager({
  // ... other config
  ipcTransport: new CustomIpcTransport(),
});
```

---

## 8. Handling Window Crashes

Electron windows can crash or become unresponsive. You can listen for these events via the `window-created` event or a plugin.

```typescript
windowManager.on('window-created', ({ window, name }) => {
  window.webContents.on('crashed', (event, killed) => {
    console.error(`Window ${name} crashed! Killed: ${killed}`);

    // Optional: Ask user to reload
    // dialog.showMessageBox(...)

    // Optional: Reload automatically
    // window.reload();
  });

  window.on('unresponsive', () => {
    console.warn(`Window ${name} is unresponsive`);
  });
});
```

---

## 9. Debugging & Performance

The kit includes powerful tools to help you debug and optimize your application.

### Debug Mode

Enable debug mode to inspect internal state in the DevTools console.

```typescript
// main/index.ts
import { DebugHelper, createElectronToolkit } from 'electron-infra-kit';

// 1. Enable Debug Mode
DebugHelper.enableDebugMode();

const kit = createElectronToolkit({
  debug: true,
});

// 2. In DevTools Console (Main Process)
// global.__ELECTRON_TOOLKIT_DEBUG__.listInstances()
// global.__ELECTRON_TOOLKIT_DEBUG__.getInstance('windowManager').getAllWindows()
```

### Performance Monitoring

Track slow operations and memory usage.

```typescript
import { EnhancedDebugHelper } from 'electron-infra-kit';

const debug = EnhancedDebugHelper.getInstance();
debug.enablePerformanceMonitoring();

// Start measuring
const endTimer = debug.createTimer('heavy-task');

// ... do work ...

// End measuring (automatically logs if slow)
endTimer();

// Get Report
console.table(debug.getStatistics());
```

For more details, see [Debug Tools Guide](./infrastructure/debug/README.md) and [Performance Guide](./performance/PERFORMANCE.md).

---

## 10. Operational Notes

This cookbook focuses on usage patterns. For runtime characteristics and
operational concerns, keep the following in mind (see the main README for
full details):

- **Dependencies & Compatibility**
  - Electron is declared as a peer dependency: `electron >= 22.0.0`.
  - Core runtime deps: `electron-log`, `tiny-typed-emitter`, `uuid`, `zod`.
  - The kit is primarily developed and tested against recent Electron 2x
    versions; very old releases may lack newer APIs like `MessageChannelMain`.

- **Performance**
  - Window state persistence uses lightweight JSON storage and only applies
    when `enablePersistence` is enabled and a `name` is provided.
  - MessageBus is designed for typical desktop apps (dozens of windows) and
    is not specifically stress-tested for hundreds of concurrent windows.

- **Error Handling**
  - IPC handlers use a unified error model and `{ code, message, data }`
    response shape (especially on legacy sync channels).
  - The preload bridge unwraps successful responses and throws on non-zero
    `code`, so renderer code should always use `try/catch`.
  - `WindowManager` logs render-process failures and attempts reloads for
    non-fatal crashes; unresponsive windows are also logged.

For a deeper discussion, refer to:

- **README – Dependencies & Compatibility**
- **README – Performance Notes**
- **README – Error Handling & Recovery**
