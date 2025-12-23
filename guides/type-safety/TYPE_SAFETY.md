# Type Safety Guide

## Overview

The `electron-infra-kit` provides branded types to enhance type safety and prevent common mistakes like passing wrong IDs or mixing up different string types.

## Branded Types

### What are Branded Types?

Branded types are a TypeScript pattern that creates distinct types from primitive types, preventing accidental misuse:

```typescript
// Without branded types
function getWindow(id: string) {}
function getHandler(name: string) {}

const windowId = 'window-123';
const handlerName = 'getUser';

getWindow(handlerName); // ❌ Compiles but wrong!
getHandler(windowId); // ❌ Compiles but wrong!

// With branded types
function getWindow(id: WindowId) {}
function getHandler(name: HandlerName) {}

const windowId: WindowId = createWindowId('window-123');
const handlerName: HandlerName = createHandlerName('getUser');

getWindow(handlerName); // ✅ TypeScript error!
getHandler(windowId); // ✅ TypeScript error!
```

## Available Branded Types

### WindowId

```typescript
import { Types } from 'electron-infra-kit';

// Create a WindowId
const windowId: Types.WindowId = Types.createWindowId('main-window');

// Type guard
if (Types.isWindowId(someString)) {
  // TypeScript knows someString is WindowId here
  windowManager.getWindowById(someString);
}
```

### EventName

```typescript
import { Types } from 'electron-infra-kit';

// Create an EventName
const eventName: Types.EventName = Types.createEventName('window-created');

// Use in event emitters
windowManager.on(eventName, (data) => {
  console.log('Event fired:', data);
});
```

### ChannelName

```typescript
import { Types } from 'electron-infra-kit';

// Create a ChannelName
const channel: Types.ChannelName = Types.createChannelName('renderer-to-main');

// Use in IPC
ipcTransport.handle(channel, async (event, data) => {
  return { success: true };
});
```

### HandlerName

```typescript
import { Types } from 'electron-infra-kit';

// Create a HandlerName
const handlerName: Types.HandlerName = Types.createHandlerName('getUser');

// Use in IPC Router
const handler = new IpcHandler(handlerName, 'user', async (api, payload) => {
  return api.db.getUser(payload.id);
});
```

### FieldKey

```typescript
import { Types } from 'electron-infra-kit';

// Create a FieldKey for MessageBus
const themeKey: Types.FieldKey = Types.createFieldKey('theme');

// Use in MessageBus
messageBus.setData(themeKey, 'dark');
const theme = messageBus.getData(themeKey);
```

## Type Guards

Type guards help you safely narrow types at runtime:

```typescript
import { Types } from 'electron-infra-kit';

// Custom Type Guard
function isWindowId(id: string): id is Types.WindowId {
  return typeof id === 'string' && id.length > 0;
}

function isEventName(id: string): id is Types.EventName {
  return typeof id === 'string' && id.length > 0;
}

function processId(id: string) {
  if (isWindowId(id)) {
    // TypeScript knows id is WindowId
    const window = windowManager.getWindowById(id);
  } else if (isEventName(id)) {
    // TypeScript knows id is EventName
    emitter.emit(id, data);
  }
}
```

## Practical Examples

### Example 1: Window Management

```typescript
import { Types } from 'electron-infra-kit';

type WindowId = Types.WindowId;
const { createWindowId } = Types;

class WindowService {
  private activeWindows = new Map<WindowId, BrowserWindow>();

  createWindow(name: string): WindowId {
    const id = createWindowId(`window-${Date.now()}`);
    const window = new BrowserWindow();

    this.activeWindows.set(id, window);
    return id;
  }

  getWindow(id: WindowId): BrowserWindow | undefined {
    return this.activeWindows.get(id);
  }

  closeWindow(id: WindowId): void {
    const window = this.activeWindows.get(id);
    window?.close();
    this.activeWindows.delete(id);
  }
}

// Usage
const service = new WindowService();
const mainWindowId = service.createWindow('main');

// ✅ Type safe
service.closeWindow(mainWindowId);

// ❌ TypeScript error - can't pass plain string
service.closeWindow('some-string');
```

### Example 2: Event System

```typescript
import { Types } from 'electron-infra-kit';

const { createEventName } = Types;
type EventName = Types.EventName;

// Define event names as constants
const EVENTS = {
  WINDOW_CREATED: createEventName('window-created'),
  WINDOW_CLOSED: createEventName('window-closed'),
  DATA_UPDATED: createEventName('data-updated'),
} as const;

class EventManager {
  private handlers = new Map<EventName, Function[]>();

  on(event: EventName, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  emit(event: EventName, data: any): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach((handler) => handler(data));
  }
}

// Usage
const eventManager = new EventManager();

// ✅ Type safe
eventManager.on(EVENTS.WINDOW_CREATED, (data) => {
  console.log('Window created:', data);
});

eventManager.emit(EVENTS.WINDOW_CREATED, { id: 'window-1' });

// ❌ TypeScript error - can't use plain string
eventManager.emit('window-created', data);
```

### Example 3: IPC Handler Registry

```typescript
import { Types } from 'electron-infra-kit';

const { createHandlerName } = Types;
type HandlerName = Types.HandlerName;

interface HandlerDefinition {
  name: HandlerName;
  handler: Function;
}

class HandlerRegistry {
  private handlers = new Map<HandlerName, Function>();

  register(definition: HandlerDefinition): void {
    this.handlers.set(definition.name, definition.handler);
  }

  execute(name: HandlerName, ...args: any[]): any {
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Handler not found: ${name}`);
    }
    return handler(...args);
  }
}

// Define handlers
const HANDLERS = {
  GET_USER: createHandlerName('getUser'),
  UPDATE_USER: createHandlerName('updateUser'),
  DELETE_USER: createHandlerName('deleteUser'),
} as const;

// Usage
const registry = new HandlerRegistry();

registry.register({
  name: HANDLERS.GET_USER,
  handler: async (id: string) => {
    return await db.getUser(id);
  },
});

// ✅ Type safe
await registry.execute(HANDLERS.GET_USER, 'user-123');

// ❌ TypeScript error
await registry.execute('getUser', 'user-123');
```

### Example 4: MessageBus with Field Keys

```typescript
import { Types } from 'electron-infra-kit';

const { createFieldKey } = Types;
type FieldKey = Types.FieldKey;

// Define field keys as constants
const FIELDS = {
  THEME: createFieldKey('theme'),
  LANGUAGE: createFieldKey('language'),
  USER_PREFERENCES: createFieldKey('userPreferences'),
} as const;

class AppState {
  constructor(private messageBus: MessageBus) {}

  setTheme(theme: 'light' | 'dark'): void {
    this.messageBus.setData(FIELDS.THEME, theme);
  }

  getTheme(): 'light' | 'dark' {
    return this.messageBus.getData(FIELDS.THEME) || 'light';
  }

  setLanguage(language: string): void {
    this.messageBus.setData(FIELDS.LANGUAGE, language);
  }

  getLanguage(): string {
    return this.messageBus.getData(FIELDS.LANGUAGE) || 'en';
  }
}

// Usage
const appState = new AppState(messageBus);

// ✅ Type safe
appState.setTheme('dark');
const theme = appState.getTheme();

// ❌ TypeScript error if trying to use plain strings internally
// messageBus.setData('theme', 'dark');
```

## Best Practices

### 1. Define Constants for Branded Types

```typescript
// ✅ Good: Define as constants
export const WINDOW_IDS = {
  MAIN: createWindowId('main'),
  SETTINGS: createWindowId('settings'),
  ABOUT: createWindowId('about'),
} as const;

// ❌ Bad: Create inline
windowManager.getWindowById(createWindowId('main'));
```

### 2. Use Type Guards for Runtime Validation

```typescript
// ✅ Good: Validate before use
function handleMessage(id: string, message: any) {
  if (!isWindowId(id)) {
    throw new Error('Invalid window ID');
  }

  const window = windowManager.getWindowById(id);
  window?.webContents.send('message', message);
}

// ❌ Bad: Assume type without validation
function handleMessage(id: WindowId, message: any) {
  // What if id is actually invalid?
  const window = windowManager.getWindowById(id);
}
```

### 3. Create Helper Functions

```typescript
// Helper to create typed window IDs
export function createTypedWindowId(prefix: string): WindowId {
  return createWindowId(`${prefix}-${Date.now()}-${Math.random()}`);
}

// Helper to validate and convert
export function toWindowId(value: unknown): WindowId {
  if (typeof value !== 'string') {
    throw new Error('Window ID must be a string');
  }
  if (!isWindowId(value)) {
    return createWindowId(value);
  }
  return value;
}
```

### 4. Document Expected Types

```typescript
/**
 * Get window by ID
 * @param id - Window ID (use createWindowId to create)
 * @returns BrowserWindow instance or undefined
 */
function getWindow(id: WindowId): BrowserWindow | undefined {
  return windows.get(id);
}
```

## Migration Guide

### From Plain Strings

```typescript
// Before
const windowId = 'main-window';
windowManager.getWindowById(windowId);

// After
import { Types } from 'electron-infra-kit';
const { createWindowId } = Types;

const windowId = createWindowId('main-window');
windowManager.getWindowById(windowId);
```

### Gradual Adoption

You can adopt branded types gradually:

```typescript
// Step 1: Start using factory functions
import { Types } from 'electron-infra-kit';
const id = Types.createWindowId('main');

// Step 2: Add type annotations
const id2: Types.WindowId = Types.createWindowId('main');

// Step 3: Use type guards for validation
if (isWindowId(userInput)) {
  processWindow(userInput);
}

// Step 4: Define constants
const MAIN_WINDOW_ID = Types.createWindowId('main');
```

## TypeScript Configuration

For best results, enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true
  }
}
```

## Common Pitfalls

### Pitfall 1: Comparing Branded Types

```typescript
// ❌ Wrong: Comparing different branded types
const windowId: WindowId = createWindowId('main');
const eventName: EventName = createEventName('main');

if (windowId === eventName) {
  // TypeScript error!
  // This won't compile
}

// ✅ Correct: Compare same types
const windowId1: WindowId = createWindowId('main');
const windowId2: WindowId = createWindowId('settings');

if (windowId1 === windowId2) {
  // OK
  // This compiles
}
```

### Pitfall 2: Serialization

```typescript
// Branded types are just strings at runtime
const windowId: WindowId = createWindowId('main');

// ✅ Can serialize normally
const json = JSON.stringify({ windowId });

// ⚠️ Need to recreate branded type when deserializing
const data = JSON.parse(json);
const id: WindowId = createWindowId(data.windowId);
```

### Pitfall 3: External APIs

```typescript
// When interfacing with external APIs that expect strings
declare function externalApi(id: string): void;

const windowId: WindowId = createWindowId('main');

// ✅ Branded types are compatible with string
externalApi(windowId); // OK

// But be careful when receiving
const receivedId: string = externalApi.getId();
const typedId: WindowId = createWindowId(receivedId); // Need to convert
```
