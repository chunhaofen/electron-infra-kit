# WindowManager Module / 窗口管理模块

`WindowManager` is a high-cohesion Electron window management module designed to solve the problem that the native `BrowserWindow` API is too low-level and lacks a unified management mechanism. It provides a window registry, duplicate creation prevention, environment-aware configuration, and graceful lifecycle management.

`WindowManager` 是一个高内聚的 Electron 窗口管理模块，旨在解决原生 `BrowserWindow` API 过于底层、缺乏统一管理机制的问题。它提供了窗口注册表、防重复创建、环境感知配置以及优雅的生命周期管理。

## Features / 核心价值

### 1. Global Window Registry / 全局窗口注册表

Built-in `WindowStore` maintains a static registry of `Map<windowId, BrowserWindow>`.
内置 `WindowStore`，维护了一个 `Map<windowId, BrowserWindow>` 的静态注册表。

- **Benefit**: You can instantly find a target window by ID or Name anywhere in your app (including IPC Handlers, Menu callbacks, Tray events) without maintaining fragile arrays yourself.
- **价值**: 你可以在应用的任何地方（包括 IPC Handler、Menu 回调、Tray 事件中）通过 ID 或 Name 瞬间找到目标窗口，而不需要自己维护脆弱的数组。

### 2. Singleton Window Assurance / 智能防重

When you try to create an existing window, the `create` method automatically executes a **"Find & Focus"** strategy:
当你尝试创建一个已存在的窗口时，`create` 方法会自动执行 **"Find & Focus"** 策略：

1.  Checks if the window exists. / 检查窗口是否已存在。
2.  If minimized, automatically restores it. / 如果已最小化，自动还原。
3.  Brings the window to front and focuses it. / 将窗口置顶并聚焦。
4.  **Does NOT** create a duplicate window instance. / **不会**创建重复的窗口实例。

### 3. Environment Awareness / 生产环境感知

Automatically identifies `IS_DEV` status:
自动识别 `IS_DEV` 状态：

- **Development**: Automatically opens DevTools.
  - **开发环境**：自动打开 DevTools。
- **Production**: Enforces DevTools disabled, disables unsafe link navigation (intercepts `new-window` events and opens in external browser by default).
  - **生产环境**：强制屏蔽 DevTools，禁用不安全的链接跳转（默认拦截 `new-window` 事件并调用外部浏览器）。

### 4. Graceful Lifecycle / 优雅的生命周期管理

Automatically handles window creation, display, hiding, and closing lifecycle events:
自动处理窗口的创建、显示、隐藏、关闭等生命周期事件：

- Automatically registers to the global registry upon creation. / 窗口创建时自动注册到全局注册表。
- Automatically cleans up from the registry upon closing. / 窗口关闭时自动从注册表中清理。
- Provides full event hooks for extending custom logic. / 提供完整的事件钩子，便于扩展自定义逻辑。

### 5. Decoupled IPC Integration / 解耦的 IPC 集成

Supports optional IPC integration via **Dependency Injection**:
支持通过**依赖注入**进行可选的 IPC 集成：

- **Flexible Setup**: Pass IPC setup logic via `ipcSetup` config.
  - **灵活配置**: 通过 `ipcSetup` 配置传入 IPC 设置逻辑。
- **Unified Entry**: Defaults to `renderer-to-main` (async) and `renderer-to-main-sync` (sync) channels when using default setup.
  - **统一通信入口**: 使用默认设置时，提供 `renderer-to-main` (异步) 和 `renderer-to-main-sync` (同步) 两个标准通信频道。
- **Command Dispatch**: Dispatches business logic via injected `IpcRouter`.
  - **命令模式分发**: 通过注入的 `IpcRouter` 分发业务逻辑。

### 6. State Persistence / 状态持久化

Built-in support for saving and restoring window states (position, size, maximization, full-screen).
内置支持保存和恢复窗口状态（位置、大小、最大化、全屏）。

- Automatically saves window state on move/resize/close.
  - 移动/调整大小/关闭时自动保存窗口状态。
- Automatically restores state when recreating the window.
  - 重新创建窗口时自动恢复状态。

### 7. Plugin System / 插件系统

Standardized plugin interface allowing external extensions to interact with the window manager.
标准化的插件接口，允许外部扩展与窗口管理器交互。

- **Initialization**: Plugins can access the `WindowManager` instance on init.
- **Interception**: Plugins can intercept window creation (`onWillCreate`) to modify config or cancel creation.
- **Lifecycle**: Plugins receive notifications for window creation and destruction.

### 8. Lifecycle Hooks / 生命周期钩子

Fine-grained control over window lifecycle events.
对窗口生命周期事件的细粒度控制。

- **onWillCreate**: Triggered before window creation. Can modify config or cancel.
- **onDidCreate**: Triggered after window is created and registered.
- **onWillDestroy**: Triggered before window is closed.
- **onDidDestroy**: Triggered after window is closed and unregistered.

## Architecture Design / 架构设计

`WindowManager` adopts a **Composition** and **Modular** design pattern, ensuring separation of concerns and maintainability.
`WindowManager` 采用**组合（Composition）**和**模块化**设计模式，确保关注点分离和可维护性。

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
                                            │ composes / 组合
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

**Responsibilities / 各层职责：**

1.  **`WindowStore` (Core Facade / 核心外观)**
    - Acts as the central coordinator for all window management operations.
    - Delegates specific tasks to specialized core modules.
    - 作为所有窗口管理操作的中央协调者。
    - 将具体任务委托给专门的核心模块。

    **Core Modules / 核心模块:**
    - **`WindowRegistry`**: Manages the storage map (`Map<ID, Win>`) and handles cleanup of destroyed windows. (管理存储映射和清理已销毁窗口)
    - **`WindowOperator`**: Encapsulates window actions (show, hide, minimize, maximize) and safety checks. (封装窗口操作和安全检查)
    - **`WindowStateManager`**: Handles persistence of window UI state (position, size, maximization). (处理窗口 UI 状态的持久化)
    - **`WindowContextManager`**: Manages custom context data associated with windows. (管理与窗口关联的自定义上下文数据)

2.  **`WindowManager` (High-Level Control / 高级控制)**
    - Composes `WindowStore` to provide a unified API.
    - Adds application-level features: Plugin system, Lifecycle hooks, IPC setup.
    - 组合 `WindowStore` 以提供统一的 API。
    - 增加应用级功能：插件系统、生命周期钩子、IPC 设置。

3.  **`Plugins & Lifecycle` (Extension / 扩展)**
    - Allows external code to hook into window creation and destruction events.
    - Supports modular extensions via the `use()` method.
    - 允许外部代码挂钩窗口创建和销毁事件。
    - 通过 `use()` 方法支持模块化扩展。

## 内部架构

`WindowStore` 采用 **组件化外观模式 (Component-Based Facade Pattern)**，将具体职责委托给内部子管理器，同时提供统一的 API。

### 组件概览

- **WindowRegistry**: 管理存储、ID/名称映射和组关系。它维护双向索引以实现高效查找。
- **WindowOperator**: 封装所有 `BrowserWindow` 操作（显示、隐藏、关闭），并包含安全检查（如 `!isDestroyed()`）。
- **WindowContextManager**: 处理任意窗口上下文数据（JSON 可序列化）的持久化。
- **WindowStateManager**: 管理 UI 状态持久化（位置、大小、最大化状态）。

### 焦点历史管理

`WindowStore` 维护一个 **焦点栈 (Focus Stack)** 来跟踪窗口激活历史，从而实现“恢复上一个窗口”的功能。

- **栈逻辑**:
  - `pushFocus(id)`: 将窗口 ID 移至栈顶（移除重复项）。
  - `popFocus()`: 移除栈顶窗口 ID。
  - `getPreviousFocusedWindow()`: 返回栈中的倒数第二个项目（因为最后一个是当前活动窗口）。

### 窗口组管理

通过 **双向索引 (Bidirectional Indexing)** 实现高效的组管理：

1. **正向索引**: `Map<groupName, Set<windowId>>` - 快速查找组内的所有窗口。
2. **反向索引**: `Map<windowId, Set<groupName>>` - 快速查找窗口所属的所有组（对清理至关重要）。

当窗口关闭时，反向索引允许以 O(1) 的时间复杂度从所有关联组中移除该窗口。

### 清理保护

为了防止“幽灵窗口”（用户/系统已销毁但仍存在于注册表中的窗口）导致的内存泄漏：

- **定期检查**: 默认每 30 秒运行一次（可配置）。
- **分块处理**: 每次 tick 检查 50 个窗口，以避免在大量窗口应用中阻塞事件循环。

## 最佳实践

## Usage / 使用方法

### 1. Basic Setup / 基本设置

```typescript
import { app } from 'electron';
import { WindowManager } from 'electron-infra-kit';
// 假设你已经有了初始化的 ipcRouter 实例
// import { ipcRouter } from "electron-infra-kit";

const windowManager = new WindowManager({
  defaultConfig: {
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  },
  // ipcSetup: IpcSetup.defaultSetup, // Optional: use default setup
  ipc: {
    autoInit: true,
  },
  ipcRouter,
  enablePersistence: true,
});

app.whenReady().then(async () => {
  // 确保 WindowManager 初始化完成（例如状态存储加载完毕）
  await windowManager.ready();

  windowManager.create({
    name: 'main-window',
    url: 'https://google.com',
  });
});
```

### 2. Creating Windows / 创建窗口

```typescript
// Create a secondary window
// 创建辅助窗口
windowManager.create({
  name: 'settings', // Unique name / 唯一名称
  width: 500,
  height: 400,
  defaultConfig: {
    // Override defaults for this window
    // 覆盖此窗口的默认配置
    resizable: false,
  },
});
```

### 3. Managing Windows / 管理窗口

```typescript
// Get window by name
// 根据名称获取窗口
const mainWin = windowManager.getWindowByName('main-window');

// Check if window exists
// 检查窗口是否存在
if (windowManager.hasByName('settings')) {
  // Close it
  // 关闭它
  windowManager.deleteByName('settings');
}

// Get all windows
// 获取所有窗口
const allWindows = windowManager.getAllWindows();
```

### 4. Using Plugins & Hooks / 使用插件与钩子

```typescript
// Define a plugin
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

// Register via config
const wm = new WindowManager({
  plugins: [LoggerPlugin],
  hooks: {
    onWillDestroy: (id) => console.log('Destroying:', id),
  },
});

// Or dynamic registration
wm.use({
  name: 'Guard',
  onWillCreate(config) {
    if (config.name === 'forbidden') return false; // Cancel creation
  },
});
```

### 5. Window Groups / 窗口组管理

Group related windows together for batch operations.
将相关窗口分组以进行批量操作。

```typescript
// Join a group
// 加入分组
windowManager.joinGroup(windowId, 'editor-windows');

// Send message to all windows in a group
// 向组内所有窗口发送消息
windowManager.sendToGroup('editor-windows', 'save-all', { timestamp: Date.now() });

// Get all windows in a group
// 获取组内所有窗口
const editors = windowManager.getGroup('editor-windows');

// Close all windows in a group
// 关闭组内所有窗口
windowManager.closeGroup('editor-windows');
```

### 6. Crash Recovery / 崩溃恢复

Handle window crashes and unresponsiveness gracefully.
优雅地处理窗口崩溃和无响应情况。

```typescript
windowManager.on('window-crash', ({ id, name, error, willReload }) => {
  console.error(`Window ${name} (${id}) crashed:`, error);

  if (willReload) {
    console.log('Attempting to reload window...');
  } else {
    // Show apology dialog or restart app
    // 显示致歉对话框或重启应用
  }
});

windowManager.on('window-unresponsive', ({ id, name }) => {
  console.warn(`Window ${name} (${id}) is hanging...`);
  // You might want to reload it forcefully
  // 你可能想要强制重载它
  // windowManager.reload(id);
});
```

### 7. Focus Management / 焦点管理

Manage window focus history and intelligent restoration.
管理窗口焦点历史和智能恢复。

```typescript
// Focus a specific window
// 聚焦特定窗口
windowManager.focus(windowId);

// Focus the previously active window (useful for tool windows)
// 聚焦上一个活动窗口（对工具类窗口很有用）
windowManager.focusPrevious();
```

### 8. Resource Disposal / 资源释放

Clean up resources when the application shuts down.
在应用程序退出时清理资源。

```typescript
app.on('before-quit', () => {
  // Disposes all windows, plugins, and clears storage
  // 释放所有窗口、插件并清理存储
  windowManager.dispose();
});
```

## API Reference / API 参考

### `WindowManager`

Inherits from `WindowStore`.
继承自 `WindowStore`。

#### `create(config: WindowCreationOptions): string`

Creates a new window or restores an existing one. Returns the window ID.
创建一个新窗口或恢复一个现有窗口。返回窗口 ID。

- `config.name`: Unique name for the window. (窗口唯一名称)
- `config.windowId`: Optional specific ID. (可选的指定 ID)
- `config.enablePersistence`: Override global persistence setting. (覆盖全局持久化设置)
- `config.defaultConfig`: Override default window options. (覆盖默认窗口选项)

#### `ready(): Promise<void>`

Waits for the WindowManager to be fully initialized.
等待 WindowManager 完全初始化。

#### `setupIPC(options?: { channel?: string; syncChannel?: string }): void`

Manually sets up IPC listeners if `autoInit` was false.
如果 `autoInit` 为 false，手动设置 IPC 监听器。

- Uses the injected `ipcSetup` function to register listeners.
- 使用注入的 `ipcSetup` 函数来注册监听器。

#### `use(plugin: WindowManagerPlugin): this`

Registers a new plugin dynamically.
动态注册一个新插件。

- **plugin**: The plugin object implementing `WindowManagerPlugin` interface.
- Returns `this` for chaining.

#### `getWindowByName(name: string): BrowserWindow | undefined`

Retrieves a `BrowserWindow` instance by its semantic name.
根据语义名称检索 `BrowserWindow` 实例。

#### `hasByName(name: string): boolean`

Checks if a window with the given name exists.
检查是否存在具有给定名称的窗口。

#### `deleteByName(name: string): boolean`

Closes and removes the window with the given name.
关闭并移除具有给定名称的窗口。

#### `getAllWindows(): BrowserWindow[]`

Returns an array of all managed `BrowserWindow` instances.
返回所有受管 `BrowserWindow` 实例的数组。

#### `getCurrentWindow(): BrowserWindow | undefined`

Returns the currently focused window or the main window.
返回当前聚焦的窗口或主窗口。

#### `joinGroup(windowId: string, group: string): void`

Adds a window to a named group.
将窗口添加到命名组。

#### `getGroup(group: string): BrowserWindow[]`

Retrieves all windows in a specific group.
获取特定组中的所有窗口。

#### `sendToGroup(group: string, channel: string, data: any): number`

Sends a message via `webContents.send` to all windows in a group. Returns the number of windows sent to.
通过 `webContents.send` 向组内所有窗口发送消息。返回发送的窗口数量。

#### `hideGroup(group: string): void`

Hides all windows in a group.
隐藏组内所有窗口。

#### `showGroup(group: string): void`

Shows all windows in a group.
显示组内所有窗口。

#### `closeGroup(group: string): Promise<void>`

Closes all windows in a group.
关闭组内所有窗口。

#### `focus(windowId: string): boolean`

Focuses a specific window. Returns true if successful.
聚焦特定窗口。如果成功返回 true。

#### `focusPrevious(): boolean`

Focuses the previously active window in the history stack.
聚焦历史栈中的上一个活动窗口。

#### `getFocusHistory(): string[]`

Returns the window ID focus history stack.
返回窗口 ID 焦点历史栈。

#### `on(event: 'window-crash', listener: (data: { windowId: string; reason: string; exitCode?: number; name?: string; willReload: boolean }) => void): this`

Listens for window crash events.
监听窗口崩溃事件。

#### `on(event: 'window-unresponsive', listener: (data: { windowId: string; name?: string }) => void): this`

Listens for window unresponsive events.
监听窗口无响应事件。

#### `saveWindowContext(windowId: string, context: any): Promise<void>`

Saves custom context data for a window.
保存窗口的自定义上下文数据。

#### `loadWindowContext(windowId: string): Promise<any>`

Loads saved context data for a window.
加载窗口已保存的上下文数据。

#### `clearWindowContext(windowId: string): Promise<void>`

Clears saved context data for a window.
清除窗口已保存的上下文数据。

#### `startCleanupProtection(intervalMs?: number): void`

Starts the periodic cleanup task to detect and remove unresponsive windows. Default interval is 30000ms.
启动定期清理任务以检测并移除无响应的窗口。默认间隔为 30000ms。

#### `stopCleanupProtection(): void`

Stops the cleanup protection task.
停止清理保护任务。

#### `dispose(): void`

Releases all resources, closes all windows, and clears storage.
释放所有资源，关闭所有窗口，并清理存储。
