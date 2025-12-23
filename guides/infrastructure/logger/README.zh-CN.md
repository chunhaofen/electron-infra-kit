# Logger Module / 日志模块

`Logger` is a wrapper around `electron-log`, providing environment-aware, configuration-friendly, and uniformly formatted logging capabilities, offering a complete logging solution for Electron applications.

`Logger` 模块是对 `electron-log` 的封装，提供了环境感知、配置友好且具有统一格式的日志记录功能，为 Electron 应用提供完整的日志解决方案。

## Features / 特性

- **Environment Awareness**: Automatically adjusts log levels and output methods based on `NODE_ENV`.
  - **环境感知**：自动根据 `NODE_ENV` 环境变量调整日志级别和输出方式。
- **Multi-Instance Support**: Supports creating independent logger instances for different modules, facilitating log isolation and management.
  - **多实例支持**：支持为不同模块创建独立的日志实例，便于日志隔离和管理。
- **Unified Format**: Uses a standardized log format including timestamps, log levels, and content.
  - **统一日志格式**：采用标准化的日志格式，包含时间戳、日志级别和日志内容。
- **Size Control**: Automatically limits log file size to prevent excessive growth (default 10MB).
  - **文件大小控制**：自动限制日志文件大小，防止日志文件过度增长（默认 10MB）。
- **Flexible Levels**: Supports multi-level logging from `silly` to `error`.
  - **灵活的日志级别**：支持从 `silly` 到 `error` 的多级日志记录。

## Installation / 安装

```bash
# npm
npm install electron-log

# yarn
yarn add electron-log

# pnpm
pnpm add electron-log
```

## Usage / 使用方法

### Basic Usage / 基本使用

```typescript
import { Logger } from 'electron-infra-kit';

// Create logger instance with module name
// 创建日志实例，指定模块名称
const logger = new Logger({ appName: 'main-window' });

// Log messages at different levels
// 记录不同级别的日志
logger.info('App started successfully / 应用启动成功');
logger.debug('Debug info: Config loaded / 调试信息：用户配置已加载');
logger.warn('Warning: High memory usage / 警告：内存使用率较高');
logger.error('Error: DB connection failed / 错误：数据库连接失败');
```

### Module Isolation / 模块隔离

```typescript
import { Logger } from 'electron-infra-kit';

// Main process logger / 主进程日志
const mainLogger = new Logger({ appName: 'main' });

// Renderer process logger / 渲染进程日志
const rendererLogger = new Logger({ appName: 'renderer' });

// IPC logger / IPC 通信日志
const ipcLogger = new Logger({ appName: 'ipc' });

// Log separately / 分别记录日志
mainLogger.info('Main process initialized / 主进程已初始化');
rendererLogger.info('Renderer loaded / 渲染进程已加载');
ipcLogger.info('IPC channel established / IPC 通道已建立');
```

## Configuration / 配置说明

### Default Configuration / 默认配置

The module automatically applies the following defaults based on the environment:
Logger 模块根据环境自动应用以下默认配置：

| Config Item / 配置项 | Development / 开发环境                            | Production / 生产环境 |
| -------------------- | ------------------------------------------------- | --------------------- |
| **File Level**       | `debug`                                           | `info`                |
| **Console Level**    | `debug`                                           | `false` (Disabled)    |
| **Filename**         | `${appName}_dev.log`                              | `${appName}.log`      |
| **Max Size**         | 10MB                                              | 10MB                  |
| **Format**           | `[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}` | (Same / 同左)         |

### Advanced Configuration / 高级配置

You can access the underlying `electron-log` instance via `getLogger()` for advanced customization:
通过 `getLogger()` 方法可以获取底层的 electron-log 实例，进行更高级的配置：

```typescript
import { Logger } from 'electron-infra-kit';

const logger = new Logger({ appName: 'main' });
const electronLog = logger.getLogger();

// Change log file path
// 修改日志文件路径
electronLog.transports.file.resolvePath = (variables) => {
  return path.join(app.getPath('logs'), variables.fileName);
};

// Add custom transport
// 增加自定义传输方式
electronLog.transports.custom = {
  send: (message) => {
    console.log('Custom transport:', message);
  },
};
```

## Log Format / 日志格式

Logs use a standardized format containing the following information:
日志采用标准化格式，包含以下信息：

```
[2023-10-01 14:30:45.123] [INFO] App started successfully
[2023-10-01 14:30:45.456] [DEBUG] Debug info: Config loaded
[2023-10-01 14:30:45.789] [WARN] Warning: High memory usage
[2023-10-01 14:30:46.012] [ERROR] Error: DB connection failed
```

- `[2023-10-01 14:30:45.123]`: Timestamp (ms precision) / 精确到毫秒的时间戳
- `[INFO]`: Log Level / 日志级别
- `App started successfully`: Log Content / 日志内容

## API Reference / API 参考

### `Logger` Class

#### `constructor(appName?: string)`

- **appName**: Optional. Name of the log instance, used to identify logs from different modules. Defaults to `'main'`.
- **appName**：可选，日志实例名称，用于标识不同模块的日志，默认为 'main'。

#### Methods / 方法

| Method / 方法      | Parameters / 参数            | Description / 描述                                    |
| ------------------ | ---------------------------- | ----------------------------------------------------- |
| `info(message)`    | `message: string`, `...args` | Log info level message / 记录信息级别日志             |
| `debug(message)`   | `message: string`, `...args` | Log debug level message / 记录调试级别日志            |
| `error(message)`   | `message: string`, `...args` | Log error level message / 记录错误级别日志            |
| `warn(message)`    | `message: string`, `...args` | Log warning level message / 记录警告级别日志          |
| `verbose(message)` | `message: string`, `...args` | Log verbose level message / 记录详细级别日志          |
| `silly(message)`   | `message: string`, `...args` | Log silly level message / 记录最详细级别日志          |
| `getLogger()`      | None                         | Get underlying `electron-log` instance / 获取底层实例 |

## Best Practices / 最佳实践

### 1. Independent Instances per Module / 为每个模块创建独立的日志实例

```typescript
// window-manager module
const windowLogger = new Logger('window-manager');

// ipc-router module
const ipcLogger = new Logger('ipc-router');

// message-bus module
const bridgeLogger = new Logger('message-bus');
```

### 2. Appropriate Log Levels / 合理使用日志级别

- **error**: Serious errors causing failure or crash. / 记录导致功能失效或应用崩溃的严重错误。
- **warn**: Warnings that might lead to issues. / 记录可能导致问题的警告信息。
- **info**: Main flow and important events. / 记录应用的主要流程和重要事件。
- **debug**: Debugging info, visible only in dev. / 记录开发调试信息，仅在开发环境可见。
- **verbose**/**silly**: Deep debugging info. / 记录非常详细的调试信息，一般用于深度调试。

### 3. Structured Content / 结构化日志内容

```typescript
// Recommended: Structured
// 推荐：结构化的日志内容
logger.info(
  `[Window Created] ID: ${windowId}, Name: ${windowName}, Dimensions: ${width}x${height}`
);

// Not Recommended: Unstructured
// 不推荐：非结构化的日志内容
logger.info('Created a window with ID ' + windowId + ' and name ' + windowName);
```

### 4. No Sensitive Data / 避免记录敏感信息

Ensure logs do not contain passwords, API keys, etc.
确保日志中不包含用户密码、API 密钥等敏感信息。

```typescript
// Not Recommended
// 不推荐
logger.debug(`Login: ${username}, Password: ${password}`);

// Recommended
// 推荐
logger.debug(`Login user: ${username}`);
```
