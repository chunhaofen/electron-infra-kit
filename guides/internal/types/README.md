# Types Module Documentation

The `types` module provides core TypeScript type definitions and utilities for the Electron Window Manager kit. It includes branded types for enhanced type safety and performance-related interfaces.

## Table of Contents

- [Branded Types](#branded-types)
  - [Overview](#overview)
  - [Available Branded Types](#available-branded-types)
  - [Usage](#usage)
- [Performance Options](#performance-options)
  - [StateKeeperOptions](#statekeeperoptions)
  - [MessageBusSubscriptionOptions](#messagebussubscriptionoptions)
  - [PerformanceOptions](#performanceoptions)
- [API Reference](#api-reference)

## Branded Types

### Overview

Branded types are TypeScript types that extend primitive types (like strings) with a "brand" to create distinct types that can't be confused with each other. This enhances type safety by preventing accidental mixing of different types of identifiers.

The module provides two versions of branded types:

1. **Runtime branded types** (`BrandedTypes.ts`): Include runtime validation and creation functions
2. **Type-only branded types** (`branded.ts`): Pure TypeScript type definitions without runtime overhead

### Available Branded Types

| Type          | Description                   | Runtime | Type-only |
| ------------- | ----------------------------- | ------- | --------- |
| `WindowId`    | Unique identifier for windows | ✓       | ✓         |
| `EventName`   | Name of events                | ✓       | ✓         |
| `ChannelName` | Name of IPC channels          | ✓       | ✓         |
| `HandlerName` | Name of IPC handlers          | ✓       | ✓         |
| `FieldKey`    | Key for MessageBus fields     | ✓       | ✓         |

### Usage

#### Runtime Branded Types

```typescript
import { Types } from 'electron-infra-kit';

// Create a window ID with validation
const windowId = Types.createWindowId('main-window');

// Create an event name with validation
const eventName = Types.createEventName('window-ready');

// This will throw an error: createWindowId('');
```

#### Type-only Branded Types

```typescript
import { Types } from 'electron-infra-kit';

// Type assertion without runtime validation
const windowId = 'main-window' as Types.WindowId;
const eventName = 'window-ready' as Types.EventName;

// Type safety prevents mixing types
function handleWindowEvent(windowId: Types.WindowId, eventName: Types.EventName) {
  // Implementation
}

// This will cause a TypeScript error
// handleWindowEvent(eventName, windowId);
```

## Performance Options

### StateKeeperOptions

Options for configuring the `StateKeeper` utility:

```typescript
import type { StateKeeperOptions } from '@/internal/types';

const options: StateKeeperOptions = {
  saveDelay: 1000, // Delay before saving state to disk (ms)
  saveStrategy: 'throttle', // Use throttle instead of debounce
  logger: customLogger, // Custom logger instance
  stateFilePath: './custom-state.json', // Custom state file path
};
```

### MessageBusSubscriptionOptions

Options for subscribing to MessageBus updates:

```typescript
import type { MessageBusSubscriptionOptions } from 'electron-infra-kit';

const options: MessageBusSubscriptionOptions = {
  filter: (key, value) => key.startsWith('user.'), // Only process user-related updates
  keys: ['user.name', 'user.email'], // Only subscribe to specific keys
  debounce: 300, // Debounce updates by 300ms
};
```

### PerformanceOptions

Options for performance monitoring:

```typescript
import type { PerformanceOptions } from '@electron-window-manager/core/types';

const options: PerformanceOptions = {
  enabled: true, // Enable performance monitoring
  sampleRate: 0.5, // Sample 50% of events
  onMetric: (metric) => {
    // Callback for performance metrics
    console.log(`${metric.name}: ${metric.duration}ms`);
  },
};
```

## API Reference

### Branded Types Creation Functions

#### `createWindowId(id: string): WindowId`

Creates a window ID with validation. Throws an error if the input is not a non-empty string.

#### `createEventName(name: string): EventName`

Creates an event name with validation. Throws an error if the input is not a non-empty string.

#### `createChannelName(name: string): ChannelName`

Creates a channel name with validation. Throws an error if the input is not a non-empty string.

#### `createHandlerName(name: string): HandlerName`

Creates a handler name with validation. Throws an error if the input is not a non-empty string.

#### `createFieldKey(key: string): FieldKey`

Creates a field key with validation. Throws an error if the input is not a non-empty string.

### Type Interfaces

#### `StateKeeperOptions`

```typescript
interface StateKeeperOptions {
  saveDelay?: number;
  saveStrategy?: 'debounce' | 'throttle';
  logger?: any;
  stateFilePath?: string;
}
```

#### `MessageBusSubscriptionOptions`

```typescript
interface MessageBusSubscriptionOptions {
  filter?: (key: string, value: unknown) => boolean;
  keys?: string[];
  debounce?: number;
}
```

#### `PerformanceOptions`

```typescript
interface PerformanceOptions {
  enabled?: boolean;
  sampleRate?: number;
  onMetric?: (metric: PerformanceMetric) => void;
}
```

#### `PerformanceMetric`

```typescript
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
```

## Best Practices

1. **Use runtime branded types** when creating identifiers from external sources (user input, configuration files) to ensure validation.

2. **Use type-only branded types** when working with internal identifiers where you're confident about the validity to avoid runtime overhead.

3. **Leverage branded types throughout your application** to prevent type confusion and improve code maintainability.

4. **Configure performance options appropriately** based on your application's needs:
   - Use shorter `saveDelay` for more responsive state persistence
   - Use `throttle` for frequent updates to limit disk I/O
   - Use `filter` and `keys` in MessageBus subscriptions to reduce unnecessary processing

5. **Enable performance monitoring selectively** in production environments to avoid performance overhead.
