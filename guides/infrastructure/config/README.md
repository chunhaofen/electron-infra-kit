# Config Manager

The Config Manager provides a robust configuration management system for Electron applications with persistence, type safety, and event-driven architecture.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Events](#events)
- [Type Safety with Zod](#type-safety-with-zod)
- [Best Practices](#best-practices)

## Features

- **Persistence**: Automatically saves configuration to disk
- **Type Safety**: Supports Zod schema validation
- **Event Driven**: Emits events for configuration changes
- **Dot Notation**: Supports nested key paths (e.g., 'ui.theme')
- **Debounced Saving**: Prevents frequent disk writes
- **Flexible Configuration**: Customizable filename, save behavior, and more

## Installation

```bash
# Install dependencies
npm install zod
```

## Usage

### Basic Usage

```typescript
import { ConfigManager } from 'electron-infra-kit';

// Create a config manager instance
const configManager = new ConfigManager({
  filename: 'app-config.json',
  autoSave: true,
  saveDelay: 500, // 500ms debounce
});

// Set configuration values
configManager.set('app.title', 'My Electron App');
configManager.set('ui.theme', 'dark');
configManager.set('ui.fontSize', 14);

// Get configuration values
const appTitle = configManager.get('app.title', 'Default App');
const uiTheme = configManager.get('ui.theme', 'light');
const fontSize = configManager.get('ui.fontSize', 12);

// Check if key exists
if (configManager.has('api.endpoint')) {
  const endpoint = configManager.get('api.endpoint');
  // Use endpoint
}

// Delete configuration value
configManager.delete('api.token');

// Get all configuration
const allConfig = configManager.getAll();

// Clear all configuration
configManager.clear();

// Force save to disk
await configManager.save();
```

### Type Safety with Zod

```typescript
import { ConfigManager } from 'electron-infra-kit';
import { z } from 'zod';

// Define schema
const configSchema = z.object({
  app: z.object({
    title: z.string().default('My App'),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
  }),
  ui: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    fontSize: z.number().min(10).max(24).default(14),
    showSidebar: z.boolean().default(true),
  }),
  api: z.object({
    endpoint: z.string().url(),
    timeout: z.number().min(1000).max(30000).default(5000),
  }),
});

// Create config manager with schema
const configManager = new ConfigManager({
  filename: 'app-config.json',
  schema: configSchema,
});

// This will validate against the schema
configManager.set('ui.theme', 'dark'); // Valid
configManager.set('ui.fontSize', 16); // Valid

// This will throw a validation error
// configManager.set('ui.theme', 'purple'); // Invalid enum value
// configManager.set('ui.fontSize', 9); // Invalid number (too small)

// Get all config with type safety
const config = configSchema.parse(configManager.getAll());
```

### Event Handling

```typescript
import { ConfigManager } from 'electron-infra-kit';

const configManager = new ConfigManager();

// Listen for configuration changes
configManager.on('change', (key, newValue, oldValue) => {
  console.log(`Config changed: ${key}`, { newValue, oldValue });
});

// Listen for configuration loaded event
configManager.on('loaded', (config) => {
  console.log('Config loaded from disk', config);
});

// Listen for configuration saved event
configManager.on('saved', () => {
  console.log('Config saved to disk');
});

// Listen for errors
configManager.on('error', (error) => {
  console.error('Config error:', error);
});
```

## API Reference

### Constructor

```typescript
new ConfigManager(options?: ConfigManagerOptions)
```

#### ConfigManagerOptions

- **filename**: Configuration filename (default: 'config.json')
- **logger**: Custom logger instance
- **autoSave**: Whether to automatically save on changes (default: true)
- **saveDelay**: Save delay in milliseconds (default: 100)
- **schema**: Zod schema for validation

### Methods

#### get<T>(key: string, defaultValue?: T): T

Get a configuration value with optional default.

#### set(key: string, value: any): void

Set a configuration value.

#### delete(key: string): void

Delete a configuration value.

#### has(key: string): boolean

Check if a key exists in the configuration.

#### clear(): void

Clear all configuration values.

#### save(): Promise<void>

Force save configuration to disk.

#### load(): void

Load configuration from disk.

#### getAll(): Record<string, any>

Get the full configuration object.

## Events

### change

Emitted when a configuration value changes.

```typescript
configManager.on('change', (key: string, newValue: any, oldValue: any) => {
  // Handle change
});
```

### loaded

Emitted when configuration is loaded from disk.

```typescript
configManager.on('loaded', (config: Record<string, any>) => {
  // Handle loaded
});
```

### saved

Emitted when configuration is saved to disk.

```typescript
configManager.on('saved', () => {
  // Handle saved
});
```

### error

Emitted when an error occurs.

```typescript
configManager.on('error', (error: Error) => {
  // Handle error
});
```

## Type Safety with Zod

The Config Manager supports type safety through Zod schemas. This allows you to define the structure of your configuration and get validation and type inference.

### Example Schema

```typescript
import { z } from 'zod';

const configSchema = z.object({
  app: z.object({
    title: z.string().default('My App'),
    version: z.string(),
  }),
  window: z.object({
    width: z.number().default(800),
    height: z.number().default(600),
    maximized: z.boolean().default(false),
  }),
  user: z.object({
    name: z.string().optional(),
    theme: z.enum(['light', 'dark']).default('light'),
  }),
});

type AppConfig = z.infer<typeof configSchema>;
```

## Best Practices

### Singleton Pattern

Create a single Config Manager instance for your application:

```typescript
// src/config/index.ts
import { ConfigManager } from 'electron-infra-kit';
import { z } from 'zod';

const configSchema = z.object({
  // Define your schema
});

export const configManager = new ConfigManager({
  filename: 'app-config.json',
  schema: configSchema,
});

export type AppConfig = z.infer<typeof configSchema>;

// Usage in other files
import { configManager } from './config';
```

### Namespacing

Use consistent namespacing for your configuration:

```typescript
// Good
configManager.set('ui.theme', 'dark');
configManager.set('ui.fontSize', 14);
configManager.set('api.endpoint', 'https://api.example.com');
configManager.set('api.timeout', 5000);

// Avoid
configManager.set('theme', 'dark');
configManager.set('fontSize', 14);
configManager.set('apiEndpoint', 'https://api.example.com');
```

### Default Values

Always provide default values when retrieving configuration:

```typescript
// Good
const theme = configManager.get('ui.theme', 'light');
const fontSize = configManager.get('ui.fontSize', 14);

// Avoid
const theme = configManager.get('ui.theme'); // Could be undefined
```

### Validation

Use Zod schema validation to ensure configuration integrity:

```typescript
// Good
const configSchema = z.object({
  ui: z.object({
    theme: z.enum(['light', 'dark']).default('light'),
    fontSize: z.number().min(10).max(24).default(14),
  }),
});

// Avoid
// No validation, could accept invalid values
```
