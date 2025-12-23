# Quick Start Guide

Get your Electron application up and running with `electron-infra-kit` in 5 minutes.

## Prerequisites

- Electron >= 22.0.0
- TypeScript >= 5.0.0
- Node.js >= 18.0.0

## 1. Installation

```bash
npm install electron-infra-kit
```

## 2. Main Process Setup

Initialize the kit in your main entry point (e.g., `src/main.ts`).

```typescript
import { app } from 'electron';
import { createElectronToolkit } from 'electron-infra-kit';
import path from 'path';

app.whenReady().then(async () => {
  // Initialize kit
  const { windowManager } = createElectronToolkit({
    ipc: { autoInit: true }, // Automatically initialize IPC handlers
    defaultConfig: {
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  });

  // Wait for initialization to complete
  await windowManager.ready();

  // Create your main window
  await windowManager.create({
    name: 'main',
    loadUrl: 'http://localhost:5173', // Or your local file
  });
});
```

## 3. Preload Script

Expose the secure API bridge in your preload script (e.g., `src/preload.ts`).

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import { IpcRendererBridge, setupMessageBus } from 'electron-infra-kit';

// Expose IPC Router API (window.ipcApi)
const ipcBridge = new IpcRendererBridge();
ipcBridge.exposeApi('ipcApi');

// Setup Message Bus connection
setupMessageBus();
```

## 4. Renderer Process

Use the kit in your frontend code.

```typescript
// Call an IPC handler
const result = await window.ipcApi.invoke('some-handler', { data: 'test' });

// Sync state across windows
await window.messageBus.setData('theme', 'dark');
```

## Next Steps

- Check out the [Cookbook](./guides/COOKBOOK.md) for real-world examples.
- Read about [Window Management](./guides/core/window/README.md).
