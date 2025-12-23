# Logger Module

[English](./README.md) | [简体中文](./README.zh-CN.md)

`Logger` is a wrapper around `electron-log`, providing environment-aware, configuration-friendly, and uniformly formatted logging capabilities, offering a complete logging solution for Electron applications.

## Features

- **Environment Awareness**: Automatically adjusts log levels and output methods based on `NODE_ENV`.
- **Multi-Instance Support**: Supports creating independent logger instances for different modules, facilitating log isolation and management.
- **Unified Format**: Uses a standardized log format including timestamps, log levels, and content.
- **Size Control**: Automatically limits log file size to prevent excessive growth (default 10MB).
- **Flexible Levels**: Supports multi-level logging from `silly` to `error`.

## Usage

### Basic Usage

```typescript
import { Logger } from 'electron-infra-kit';

const logger = new Logger({ appName: 'main-window' });

logger.info('App started successfully');
logger.debug('Debug info: Config loaded');
logger.warn('Warning: High memory usage');
logger.error('Error: DB connection failed');
```

### Module Isolation

```typescript
import { Logger } from 'electron-infra-kit';

const mainLogger = new Logger('main');
const rendererLogger = new Logger('renderer');
const ipcLogger = new Logger('ipc');

mainLogger.info('Main process initialized');
rendererLogger.info('Renderer loaded');
ipcLogger.info('IPC channel established');
```

## Configuration

### Default Configuration

The module automatically applies the following defaults based on the environment:

| Config Item       | Development                                       | Production         |
| ----------------- | ------------------------------------------------- | ------------------ |
| **File Level**    | `debug`                                           | `info`             |
| **Console Level** | `debug`                                           | `false` (Disabled) |
| **Filename**      | `${appName}_dev.log`                              | `${appName}.log`   |
| **Max Size**      | 10MB                                              | 10MB               |
| **Format**        | `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}` | (Same)             |

### Advanced Configuration

```typescript
import { Logger } from 'electron-infra-kit';

const logger = new Logger({ appName: 'main' });
const electronLog = logger.getLogger();

// Change log file path
electronLog.transports.file.resolvePath = (variables) => {
  return path.join(app.getPath('logs'), variables.fileName);
};

// Add custom transport
electronLog.transports.custom = {
  send: (message) => {
    console.log('Custom transport:', message);
  },
};
```

## Log Format

```
[2023-10-01 14:30:45.123] [INFO] App started successfully
[2023-10-01 14:30:45.456] [DEBUG] Debug info: Config loaded
[2023-10-01 14:30:45.789] [WARN] Warning: High memory usage
[2023-10-01 14:30:46.012] [ERROR] Error: DB connection failed
```

## API Reference

### `Logger` Class

#### `constructor(options: LoggerOptions)`

- **options**: Configuration options.
  - **appName**: Optional. Name of the log instance. Defaults to `'main'`.
  - **maxSize**: Optional. Max file size in bytes.
  - **fileName**: Optional. Custom log filename.

#### Methods

| Method             | Parameters                   | Description                            |
| ------------------ | ---------------------------- | -------------------------------------- |
| `info(message)`    | `message: string`, `...args` | Log info level message                 |
| `debug(message)`   | `message: string`, `...args` | Log debug level message                |
| `error(message)`   | `message: string`, `...args` | Log error level message                |
| `warn(message)`    | `message: string`, `...args` | Log warning level message              |
| `verbose(message)` | `message: string`, `...args` | Log verbose level message              |
| `silly(message)`   | `message: string`, `...args` | Log silly level message                |
| `getLogger()`      | None                         | Get underlying `electron-log` instance |

## Best Practices

### 1. Independent Instances per Module

```typescript
const windowLogger = new Logger('window-manager');
const ipcLogger = new Logger('ipc-router');
const bridgeLogger = new Logger('message-bus');
```

### 2. Appropriate Log Levels

- **error**: Serious errors causing failure or crash.
- **warn**: Warnings that might lead to issues.
- **info**: Main flow and important events.
- **debug**: Debugging info, visible only in dev.
- **verbose**/**silly**: Deep debugging info.

### 3. Structured Content

```typescript
// Recommended: Structured
logger.info(
  `[Window Created] ID: ${windowId}, Name: ${windowName}, Dimensions: ${width}x${height}`
);

// Not Recommended: Unstructured
logger.info('Created a window with ID ' + windowId + ' and name ' + windowName);
```

### 4. No Sensitive Data

Ensure logs do not contain passwords, API keys, etc.

```typescript
// Not Recommended
logger.debug(`Login: ${username}, Password: ${password}`);

// Recommended
logger.debug(`Login user: ${username}`);
```
