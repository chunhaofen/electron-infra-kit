# 多窗口管理示例

本目录包含多窗口场景下的各种示例，演示窗口间通信、状态同步等功能。

## 示例列表

### ipc-communication - 窗口间 IPC 通信

演示如何使用 IpcRouter 实现窗口间的消息传递。

**核心功能：**
- 创建发送方和接收方窗口
- 使用 IpcRouter 注册转发处理器
- 通过 `webContents.send()` 发送消息
- 在渲染进程中监听自定义事件

**运行方式：**
```bash
cd examples/multi-window/ipc-communication
electron main.js
```

**通信流程：**
```
发送方窗口 → ipcRenderer.invoke('send-to-receiver')
    ↓
主进程 IpcRouter 处理器
    ↓
接收方窗口 ← webContents.send('custom-event')
```

### state-sync - 状态同步

演示如何使用 MessageBus 在多个窗口间同步状态。

**核心功能：**
- 使用 MessageBus 管理共享状态
- 通过 `messageBus.setData()` 更新状态
- 自动同步到所有注册的窗口
- 实时响应状态变化

**运行方式：**
```bash
cd examples/multi-window/state-sync
electron main.js
```

**关键代码：**
```javascript
// 主进程：更新状态
ipcMain.on('set-data', (_event, { key, value }) => {
  messageBus.setData(key, value) // 自动同步到所有窗口
})

// 渲染进程：监听变化
ipcRenderer.on('message-bus:data-changed', (event, { key, value }) => {
  console.log(`${key} 更新为:`, value)
})
```

### custom-windows - 自定义窗口管理

演示如何创建不同类型的专用窗口（登录窗口、播放器窗口等）。

**核心功能：**
- 创建无边框窗口
- 创建置顶窗口
- 自定义窗口样式
- 窗口复用和聚焦

**运行方式：**
```bash
cd examples/multi-window/custom-windows
electron main.js
```

**窗口类型：**
- 登录窗口：无边框、置顶、固定大小
- 播放器窗口：自定义标题栏、深色背景

## 相关文档

- [WindowManager 文档](../../guides/window-manager.md)
- [MessageBus 文档](../../guides/message-bus.md)
- [窗口间通信指南](../../guides/inter-window-communication.md)
