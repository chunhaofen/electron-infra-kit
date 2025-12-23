# Utils Module Documentation

[English](./README.md) | [简体中文](./README.zh-CN.md)

> **Note**: This is an internal module used by the kit. It is not exported from the main package entry point and should not be used directly in your application unless you are modifying the kit itself.

The `utils` module provides various utility classes and functions that support the core functionality of the Electron Infra Kit.

## Table of Contents

- [StateKeeper](#statekeeper)
- [MessageDispatcher](#messagedispatcher)
- [Branded Helpers](#branded-helpers)
- [RateLimiter](#ratelimiter)
- [Delay Utility](#delay-utility)

## StateKeeper

Window state manager that persists and restores Electron window positions, sizes, and states.

### Features

- Persists window state to file system
- Automatically validates window state (ensures window stays within available display bounds)
- Supports debounced or throttled saving strategies
- Prevents conflicts from multiple instances writing to the same state file
- Automatic cleanup on application exit

### Advanced Features

#### Atomic Write
StateKeeper ensures data integrity by using a **write-then-rename** strategy:
1. Write state to a temporary file (`.tmp`).
2. Rename the temporary file to the target file (Atomic operation).
3. Automatically clean up temporary files on failure.

#### Performance Optimization
- **Dirty Check**: Compares the new state with the current in-memory state before triggering a save.
- **MD5 Hash Check**: Calculates the MD5 hash of the JSON content before writing to disk. If the hash matches the last saved hash, the write is skipped.

#### File Locking
Uses a static `activeFiles` Set to prevent multiple `StateKeeper` instances in the same process from writing to the same file, avoiding race conditions.

#### Boundary Validation
Ensures the window is visible on current displays:
1. Exact match check: If `displayBounds` matches a current display, use saved coordinates.
2. Intersection check: If no exact match, checks if the window rectangle intersects with any display.
3. Fallback: Resets to default position if the window is off-screen (e.g., disconnected monitor).

### Usage

```typescript
import StateKeeper from '@/internal/utils/StateKeeper';
import { BrowserWindow } from 'electron';

// Create StateKeeper instance
const stateKeeper = new StateKeeper({
  saveDelay: 500, // Delay before saving state (default: 500ms)
  saveStrategy: 'debounce', // Save strategy: 'debounce' or 'throttle' (default: 'debounce')
});

// Create a window with saved state
const windowName = 'main';
const defaultState = { width: 800, height: 600, isMaximized: false, isFullScreen: false };
const savedState = stateKeeper.getState(windowName, defaultState);

const mainWindow = new BrowserWindow({
  width: savedState.width,
  height: savedState.height,
  x: savedState.x,
  y: savedState.y,
});

// Restore window state
if (savedState.isMaximized) {
  mainWindow.maximize();
}

// Save window state when it changes
mainWindow.on('resize', () => {
  if (!mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
    const bounds = mainWindow.getBounds();
    stateKeeper.saveState(windowName, {
      ...bounds,
      isMaximized: mainWindow.isMaximized(),
      isFullScreen: mainWindow.isFullScreen(),
    });
  }
});

mainWindow.on('move', () => {
  // Same save logic as resize
});

mainWindow.on('maximize', () => {
  stateKeeper.saveState(windowName, {
    ...stateKeeper.getState(windowName, defaultState),
    isMaximized: true,
  });
});
```

### API

#### StateKeeperOptions

```typescript
interface StateKeeperOptions {
  saveDelay?: number; // Default: 500
  saveStrategy?: 'debounce' | 'throttle'; // Default: 'debounce'
  logger?: ILogger;
  stateFilePath?: string;
}
```

#### WindowState

```typescript
interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
  displayBounds?: Electron.Rectangle;
  groups?: string[];
}
```

#### Methods

- `constructor(options?: StateKeeperOptions)` - Creates a new StateKeeper instance
- `getState(windowName: string, defaultState: WindowState): WindowState` - Gets saved state for a window
- `saveState(windowName: string, windowState: WindowState): void` - Saves window state
- `flushSync(): void` - Immediately saves all state to disk
- `clearState(windowName?: string): void` - Clears state for a window or all windows

## MessageDispatcher

Generic event/message dispatching utility that unifies message handling across different components.

### Features

- Simple API for registering and dispatching messages
- Supports asynchronous handlers
- Built-in error handling
- Metadata support for handlers (e.g., validation schemas)

### Usage

```typescript
import { MessageDispatcher } from '@/internal/utils';

// Create dispatcher instance
const dispatcher = new MessageDispatcher('MyApp');

// Register a handler
interface Context {
  userId: string;
}

dispatcher.register('greet', (context: Context, data: { name: string }) => {
  return `Hello ${data.name}, you're logged in as ${context.userId}`;
});

// Register an async handler
interface User {
  id: string;
  name: string;
}

dispatcher.register('getUser', async (context: Context, userId: string): Promise<User> => {
  const user = await fetchUserFromDatabase(userId);
  return user;
});

// Dispatch messages
const result = dispatcher.dispatch('greet', { userId: '123' }, { name: 'Alice' });
console.log(result); // Output: "Hello Alice, you're logged in as 123"

// Dispatch async messages
dispatcher
  .dispatch('getUser', { userId: '123' }, '456')
  .then((user) => console.log(user))
  .catch((error) => console.error(error));
```

### API

#### HandlerCallback

```typescript
type HandlerCallback<Context, T = any, R = any> = (context: Context, data: T) => R | Promise<R>;
```

#### Methods

- `constructor(name: string, logger?: ILogger, errorHandler?: (error: any, name: string) => any)` - Creates a new MessageDispatcher instance
- `register<T = any, R = any>(name: string, handler: HandlerCallback<Context, T, R>, metadata?: any): void` - Registers a handler
- `unregister(name: string): boolean` - Unregisters a handler
- `getMetadata(name: string): any | undefined` - Gets handler metadata
- `dispatch<T = any, R = any>(name: string, context: Context, data: T): R | undefined` - Dispatches a message
- `has(name: string): boolean` - Checks if a handler exists
- `getHandlerNames(): string[]` - Gets all registered handler names
- `clear(): void` - Clears all handlers

## Branded Helpers

Utility functions for creating and validating branded types to improve type safety.

### Features

- Creates validated branded types
- Ensures type safety across the application
- Provides consistent validation logic

### Usage

```typescript
import {
  createWindowId,
  createEventName,
  createChannelName,
  createHandlerName,
  createFieldKey,
} from '@/internal/utils';

// Create branded types
const windowId = createWindowId('main-window');
const eventName = createEventName('window-resized');
const channelName = createChannelName('main-ipc');
const handlerName = createHandlerName('get-user');
const fieldKey = createFieldKey('username');

// These will throw errors
// createWindowId(''); // Empty string
// createWindowId(null); // Not a string
```

### API

- `createWindowId(id: string): WindowId` - Creates a validated WindowId
- `createEventName(name: string): EventName` - Creates a validated EventName
- `createChannelName(name: string): ChannelName` - Creates a validated ChannelName
- `createHandlerName(name: string): HandlerName` - Creates a validated HandlerName
- `createFieldKey(key: string): FieldKey` - Creates a validated FieldKey

## RateLimiter

Rate limiting utility to prevent excessive operations.

### Features

- Configurable rate limits per key pattern
- Default limit support
- Automatic cleanup of expired entries
- Memory efficient

### Usage

```typescript
import { RateLimiter } from '@/internal/utils';

// Create RateLimiter instance
const rateLimiter = new RateLimiter({
  defaultLimit: { limit: 10, interval: 1000 }, // Default: 10 requests per second
  cleanupInterval: 60000, // Cleanup expired entries every minute
});

// Set specific limit for a handler
rateLimiter.setLimit('fileDownload', { limit: 5, interval: 1000 });

// Check if an action is allowed
function handleDownloadRequest(windowId: string, fileName: string) {
  const key = `${windowId}:fileDownload`;
  const ruleKey = 'fileDownload';

  if (!rateLimiter.check(key, ruleKey)) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Process download request
  return downloadFile(fileName);
}

// Cleanup when no longer needed
rateLimiter.stopCleanup();
```

### API

#### RateLimitConfig

```typescript
interface RateLimitConfig {
  limit: number; // Maximum number of requests
  interval: number; // Time window in milliseconds
}
```

#### Methods

- `constructor(options?: { logger?: ILogger; defaultLimit?: RateLimitConfig; cleanupInterval?: number })` - Creates a new RateLimiter instance
- `setLimit(keyPattern: string, config: RateLimitConfig): void` - Sets a rate limit for a key pattern
- `check(key: string, ruleKey: string): boolean` - Checks if an action is allowed
- `clear(): void` - Clears all rate limit state
- `cleanup(): void` - Manually cleans up expired entries
- `stopCleanup(): void` - Stops the automatic cleanup timer

## Delay Utility

Simple Promise-based delay utility.

### Usage

```typescript
import { delay } from '@/internal/utils';

async function sequentialOperations() {
  console.log('Operation 1');
  await delay(1000); // Wait for 1 second
  console.log('Operation 2');
  await delay(2000); // Wait for 2 seconds
  console.log('Operation 3');
}

sequentialOperations();
```

### API

- `delay(time: number): Promise<void>` - Waits for the specified time (in milliseconds)
