# Lifecycle Manager

The Lifecycle Manager orchestrates the startup and shutdown of the Electron Toolkit modules, ensuring proper initialization order and graceful shutdown.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Features

- **Module Orchestration**: Coordinates startup order of core modules
- **Auto-start Option**: Automatically initializes modules on instantiation
- **Graceful Shutdown**: Ensures proper cleanup of all resources
- **Existing Instance Support**: Works with pre-existing module instances
- **Debug Mode Integration**: Automatically enables debug mode in development

## Installation

```bash
# Install dependencies
npm install
```

## Usage

### Basic Usage

```typescript
import { LifecycleManager } from 'electron-infra-kit';
import path from 'path';

// Create lifecycle manager instance
const lifecycleManager = new LifecycleManager({
  // WindowManager configuration
  defaultConfig: {
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  },
  autoStart: true, // Auto-start all services
});

// Access initialized modules
// Note: They are available after startup() completes
const { windowManager, ipcRouter, messageBus } = lifecycleManager;
```

### Manual Startup

```typescript
import { LifecycleManager } from 'electron-infra-kit';

// Create lifecycle manager without auto-start
const lifecycleManager = new LifecycleManager({
  defaultConfig: {
    // Window defaults
  },
});

// Start services manually
async function initializeApp() {
  try {
    await lifecycleManager.startup();
    console.log('All services started successfully');
  } catch (error) {
    console.error('Failed to start services:', error);
  }
}

// Shutdown services gracefully
async function shutdownApp() {
  try {
    await lifecycleManager.shutdown();
    console.log('All services shutdown successfully');
  } catch (error) {
    console.error('Failed to shutdown services:', error);
  }
}

// Initialize app
initializeApp();

// When exiting the application
process.on('SIGINT', () => {
  shutdownApp();
});
```

### Using Existing Instances

```typescript
import {
  LifecycleManager,
  WindowManager,
  IpcRouter,
  MessageBus,
  Logger,
} from 'electron-infra-kit';

// Create instances manually
const logger = new Logger({ appName: 'MyApp' });
const ipcRouter = new IpcRouter({ logger });
const messageBus = new MessageBus({ logger });
const windowManager = new WindowManager({
  defaultConfig: {
    // Window defaults
  },
  ipcRouter,
  messageBus,
  logger,
});

// Create lifecycle manager with existing instances
const lifecycleManager = new LifecycleManager({
  ipcRouter,
  messageBus,
  windowManager,
  logger,
  autoStart: true,
});
```

### Debug Mode

```typescript
import { LifecycleManager } from 'electron-infra-kit';
import { DebugHelper } from 'electron-infra-kit';

// Create lifecycle manager in development mode
const lifecycleManager = new LifecycleManager({
  defaultConfig: {
    // Window defaults
  },
  isDevelopment: true, // Enable debug mode
  autoStart: true,
});

// Debug instances are automatically registered
// Access via global.__ELECTRON_TOOLKIT_DEBUG__
```

## API Reference

### Constructor

```typescript
new LifecycleManager(config: LifecycleConfig = {})
```

#### LifecycleConfig

```typescript
interface LifecycleConfig extends WindowManagerConfig {
  /**
   * Whether to automatically start on instantiation (default: false)
   */
  autoStart?: boolean;

  /**
   * Existing IpcRouter instance
   */
  ipcRouter?: IpcRouter;

  /**
   * Existing WindowManager instance
   */
  windowManager?: WindowManager;

  /**
   * Existing MessageBus instance
   */
  messageBus?: MessageBus;
}
```

### Properties

#### windowManager?: WindowManager

The initialized WindowManager instance.

#### ipcRouter?: IpcRouter

The initialized IpcRouter instance.

#### messageBus?: MessageBus

The initialized MessageBus instance.

#### started: boolean

Whether all services have been started successfully.

### Methods

#### async startup(): Promise<void>

Starts up all services in the correct order.

#### async shutdown(): Promise<void>

Shuts down all services gracefully in reverse order.

## Best Practices

### Centralized Module Management

Use LifecycleManager to centralize module initialization and cleanup:

```typescript
// src/app.ts
import { LifecycleManager } from '@/index';
import path from 'path';

// Create lifecycle manager
const lifecycleManager = new LifecycleManager({
  defaultConfig: {
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  },
  autoStart: true,
});

export default lifecycleManager;

// Usage in other files
import lifecycleManager from './app';

async function createNewWindow() {
  if (lifecycleManager.started && lifecycleManager.windowManager) {
    await lifecycleManager.windowManager.create({
      name: 'secondary',
      url: 'secondary.html',
      defaultConfig: {
        width: 600,
        height: 400,
      },
    });
  }
}
```

### Graceful Shutdown

Ensure proper cleanup on application exit:

```typescript
import { app } from 'electron';
import lifecycleManager from './app';

// Handle graceful shutdown
app.on('before-quit', async (event) => {
  event.preventDefault();
  try {
    await lifecycleManager.shutdown();
    app.exit(0);
  } catch (error) {
    console.error('Shutdown failed:', error);
    app.exit(1);
  }
});
```

### Debug Mode

Use debug mode in development:

```typescript
import { LifecycleManager } from '@/index';

const isDev = process.env.NODE_ENV === 'development';

const lifecycleManager = new LifecycleManager({
  isDevelopment: isDev,
  autoStart: true,
});

if (isDev) {
  console.log('Debug mode enabled. Access global.__ELECTRON_TOOLKIT_DEBUG__ in console.');
}
```

### Integration with createElectronToolkit

```typescript
import { createElectronToolkit } from 'electron-infra-kit';

// Create kit with lifecycle management
const kit = createElectronToolkit({
  windowConfigs: {
    // Window configurations
  },
  debug: true,
  autoStart: true,
});

// Access lifecycle manager
const lifecycleManager = kit.lifecycleManager;
```

## Module Initialization Order

The Lifecycle Manager initializes modules in the following order:

1. **IpcRouter**: Sets up communication infrastructure
2. **MessageBus**: Initializes cross-window messaging
3. **WindowManager**: Creates and manages application windows
4. **Debug Integration**: Registers instances for debugging (if in development mode)

## Shutdown Order

The Lifecycle Manager shuts down modules in reverse order:

1. **MessageBus**: Disposes message channels
2. **WindowManager**: Closes all windows and cleans up resources
3. **IpcRouter**: Removes IPC handlers and cleans up

This ensures proper resource cleanup and prevents memory leaks.
