# 生产环境模板

这是一个生产就绪的完整应用模板，集成了 electron-infra-kit 的所有核心功能。

## 功能特性

### 核心功能
- ✅ WindowManager - 窗口管理
- ✅ IpcRouter - IPC 路由
- ✅ MessageBus - 状态同步
- ✅ 调试模式支持
- ✅ 完整的错误处理
- ✅ TypeScript 类型支持（通过 JSDoc）

### 架构特点
- 模块化设计
- 依赖注入
- 统一的错误处理
- 日志记录
- 状态管理

## 项目结构

```
production-template/
├── main/
│   ├── index.js          # 主进程入口
│   └── handlers.js       # IPC 处理器
├── preload/
│   └── index.js          # Preload 脚本
├── renderer/
│   ├── main/             # 主窗口
│   ├── about/            # 关于窗口
│   ├── settings/         # 设置窗口
│   └── shared/           # 共享资源
└── README.md             # 本文档
```

## 运行方式

```bash
cd examples/production-template
electron main/index.js
```

## 核心代码解析

### 1. 主进程初始化

```javascript
const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
  defaultConfig: {
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  },
})
```

### 2. MessageBus 状态管理

```javascript
// 初始化共享状态
messageBus.initializeListener()

messageBus.setData('appConfig', {
  theme: 'light',
  language: 'zh-CN',
  version: '1.0.0'
})

messageBus.setData('userSession', {
  username: 'Demo User',
  isLoggedIn: true,
  lastLogin: Date.now()
})
```

### 3. IPC 处理器注册

```javascript
const handlers = createHandlers(messageBus)
handlers.forEach(handler => ipcRouter.addHandler(handler))
```

### 4. 窗口创建和注册

```javascript
const mainId = windowManager.create({
  name: 'main',
  title: '生产级应用示例',
  loadFile: path.join(__dirname, '../renderer/main/index.html')
})

const mainWin = windowManager.getWindowById(mainId)
if (mainWin) {
  messageBus.registerWindowPort(mainId, mainWin)
}
```

## 扩展指南

### 添加新的 IPC 处理器

1. 在 `main/handlers.js` 或新文件中定义
2. 导出处理器数组
3. 在 `main/index.js` 中导入并注册

```javascript
// main/user-handlers.js
export default [
  new IpcHandler('user:login', 'invoke', async (api, data) => {
    // 处理登录逻辑
  })
]

// main/index.js
import userHandlers from './user-handlers.js'
userHandlers.forEach(h => ipcRouter.addHandler(h))
```

### 添加新的共享状态

```javascript
messageBus.setData('newState', {
  // 状态数据
})
```

### 添加新窗口

```javascript
const newWindowId = windowManager.create({
  name: 'settings',
  title: '设置',
  width: 600,
  height: 400,
  loadFile: path.join(__dirname, '../renderer/settings/index.html')
})

// 注册到 MessageBus
const newWin = windowManager.getWindowById(newWindowId)
messageBus.registerWindow(newWindowId, newWin)
```

## 最佳实践

1. **安全性**
   - 始终使用 `contextIsolation: true`
   - 使用 preload 脚本暴露安全的 API
   - 验证所有来自渲染进程的输入

2. **性能**
   - 合理使用 MessageBus，避免频繁更新大对象
   - 及时清理不需要的窗口
   - 使用窗口预加载优化用户体验

3. **可维护性**
   - 保持处理器职责单一
   - 使用依赖注入解耦模块
   - 添加完善的错误处理和日志

4. **测试**
   - 为处理器编写单元测试
   - 使用 mock 对象测试依赖注入
   - 测试窗口生命周期
