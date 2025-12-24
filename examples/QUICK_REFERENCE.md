# Examples 快速参考

## 常用代码片段

### 1. 基础初始化

```javascript
import { createElectronToolkit } from 'electron-infra-kit'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
  defaultConfig: {
    width: 1024,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  },
})
```

### 2. 创建窗口

```javascript
// 基础创建
const id = windowManager.create({
  name: 'main',
  title: '主窗口',
  loadFile: path.join(__dirname, '../renderer/index.html')
})

// 获取窗口对象
const win = windowManager.getWindowById(id)

// 通过名称获取窗口
const mainWin = windowManager.getWindowByName('main')

// 通过名称获取窗口 ID
const mainId = windowManager.getWindowByNameId('main')
```

### 3. IPC 处理器

```javascript
// 方式 1: 对象形式
ipcRouter.addHandler({
  name: 'my-handler',
  callback: (api, data) => {
    return { success: true, data }
  }
})

// 方式 2: IpcHandler 类
import { IpcHandler } from 'electron-infra-kit'

const handler = new IpcHandler(
  'my-handler',
  'category',
  (api, data) => {
    return { success: true, data }
  }
)
ipcRouter.addHandler(handler)

// 批量注册
ipcRouter.addHandlers([handler1, handler2, handler3])
```

### 4. 依赖注入

```javascript
// 注入单个依赖
ipcRouter.addApi('db', database)

// 批量注入
ipcRouter.addApis({
  app,
  db: database,
  logger,
  config
})

// 在处理器中使用
const handler = {
  name: 'get-user',
  callback: (api, data) => {
    const user = api.db.getUser(data.id)
    api.logger.info('User fetched:', user)
    return user
  }
}
```

### 5. MessageBus 状态同步

```javascript
// 初始化
messageBus.initializeListener()

// 设置数据
messageBus.setData('theme', 'dark')
messageBus.setData('user', { name: 'Alice', role: 'admin' })

// 注册窗口
const win = windowManager.getWindowById(windowId)
messageBus.registerWindow(windowId, win)

// 在渲染进程监听（preload.js）
contextBridge.exposeInMainWorld('messageBus', {
  onDataChanged: (callback) => {
    ipcRenderer.on('message-bus:data-changed', (event, data) => {
      callback(data)
    })
  }
})
```

### 6. 窗口间通信

```javascript
// 方式 1: 通过 IpcRouter 转发
ipcRouter.addHandler({
  name: 'send-to-window',
  callback: (api, { targetName, event, data }) => {
    const targetWin = api.windowManager.getWindowByName(targetName)
    if (targetWin) {
      targetWin.webContents.send(event, data)
      return { success: true }
    }
    return { success: false, error: 'Window not found' }
  }
})

// 方式 2: 直接发送
const receiverWin = windowManager.getWindowByName('receiver')
if (receiverWin) {
  receiverWin.webContents.send('custom-event', { message: 'Hello' })
}
```

### 7. 插件系统

```javascript
// 定义插件
const MyPlugin = {
  name: 'MyPlugin',
  onInit(windowManager) {
    console.log('插件初始化')
  },
  onWillCreate(config) {
    console.log('窗口即将创建:', config.name)
    // 可以修改配置
    config.backgroundColor = '#ffffff'
    return config
  },
  onDidCreate({ id, name }) {
    console.log('窗口已创建:', name)
  },
  onWillDestroy(id) {
    console.log('窗口即将销毁:', id)
  },
  onDidDestroy(id) {
    console.log('窗口已销毁:', id)
  }
}

// 注册插件
const { windowManager } = createElectronToolkit({
  plugins: [MyPlugin]
})

// 或动态添加
windowManager.use(AnotherPlugin)
```

### 8. 生命周期钩子

```javascript
const { windowManager } = createElectronToolkit({
  hooks: {
    onWillCreate: (config) => {
      console.log('准备创建:', config.name)
    },
    onDidCreate: ({ id, name }) => {
      console.log('已创建:', name)
    },
    onWillDestroy: (id) => {
      console.log('即将销毁:', id)
    },
    onDidDestroy: (id) => {
      console.log('已销毁:', id)
    }
  }
})
```

### 9. 调试模式

```javascript
const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
  isDevelopment: true, // 启用调试模式
})

// 在浏览器控制台访问
// __ELECTRON_TOOLKIT_DEBUG__.windowManager
// __ELECTRON_TOOLKIT_DEBUG__.ipcRouter
// __ELECTRON_TOOLKIT_DEBUG__.messageBus
```

### 10. 错误处理

```javascript
import { ValidationError, NotFoundError, PermissionError } from 'electron-infra-kit'

ipcRouter.addHandler({
  name: 'create-user',
  callback: async (api, data) => {
    // 验证错误
    if (!data.email) {
      throw new ValidationError('邮箱不能为空', { field: 'email' })
    }
    
    // 未找到错误
    const user = await api.db.findUser(data.id)
    if (!user) {
      throw new NotFoundError('用户不存在', { userId: data.id })
    }
    
    // 权限错误
    if (!user.isAdmin) {
      throw new PermissionError('需要管理员权限', { userId: data.id })
    }
    
    return { success: true }
  }
})
```

### 11. Preload 脚本模板

```javascript
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // IPC 调用
  invoke: (name, payload) => {
    return ipcRenderer.invoke('renderer-to-main', { name, payload })
  },
  
  // 监听事件
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(...args))
  },
  
  // 移除监听
  off: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback)
  },
  
  // MessageBus 监听
  onDataChanged: (callback) => {
    ipcRenderer.on('message-bus:data-changed', (event, data) => {
      callback(data)
    })
  }
})
```

### 12. 渲染进程调用示例

```javascript
// HTML 中
<script type="module">
  // IPC 调用
  async function callHandler() {
    const result = await window.api.invoke('my-handler', { data: 'test' })
    console.log(result)
  }
  
  // 监听事件
  window.api.on('custom-event', (data) => {
    console.log('收到消息:', data)
  })
  
  // MessageBus 监听
  window.api.onDataChanged(({ key, value }) => {
    console.log(`${key} 更新为:`, value)
  })
</script>
```

### 13. 日志与 IPC 传输配置

```javascript
import { createElectronToolkit } from 'electron-infra-kit'

const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
  loggerOptions: {
    appName: 'main',
    ipcEnabled: true,
    ipcLevel: 'info',
  },
})
```

## 常见模式

### 单例窗口

```javascript
function openSettingsWindow() {
  // 检查是否已存在
  const existingWin = windowManager.getWindowByName('settings')
  if (existingWin) {
    existingWin.focus()
    return windowManager.getWindowByNameId('settings')
  }
  
  // 创建新窗口
  return windowManager.create({
    name: 'settings',
    title: 'Settings',
    width: 600,
    height: 400,
    loadFile: path.join(__dirname, '../renderer/settings/index.html')
  })
}
```

### 模态窗口

```javascript
const modalId = windowManager.create({
  name: 'modal',
  title: 'Modal Window',
  width: 400,
  height: 300,
  modal: true,
  parent: mainWindow, // 设置父窗口
  resizable: false,
  loadFile: path.join(__dirname, '../renderer/modal/index.html')
})
```

### 无边框窗口

```javascript
const id = windowManager.create({
  name: 'frameless',
  title: 'Frameless Window',
  width: 800,
  height: 600,
  frame: false,
  transparent: true,
  loadFile: path.join(__dirname, '../renderer/frameless/index.html')
})
```

## 调试技巧

### 1. 查看所有窗口

```javascript
// 在浏览器控制台
__ELECTRON_TOOLKIT_DEBUG__.windowManager.windowStore.getAllWindows()
```

### 2. 查看所有处理器

```javascript
__ELECTRON_TOOLKIT_DEBUG__.ipcRouter.getHandlers()
```

### 3. 查看 MessageBus 数据

```javascript
__ELECTRON_TOOLKIT_DEBUG__.messageBus.getData('key')
```

### 4. 性能监控

```javascript
import { EnhancedDebugHelper } from 'electron-infra-kit'
const debug = EnhancedDebugHelper.getInstance()

debug.enablePerformanceMonitoring()
const timer = debug.createTimer('operation-name')
// ... 执行操作
timer() // 输出耗时
```

## 最佳实践

1. **始终使用 contextIsolation: true**
2. **使用 preload 脚本暴露安全的 API**
3. **为窗口设置唯一的 name**
4. **使用依赖注入解耦模块**
5. **添加完善的错误处理**
6. **在开发环境启用调试模式**
7. **使用 MessageBus 同步跨窗口状态**
8. **及时清理不需要的窗口**

## 相关文档

- [完整示例](./README.md)
- [API 文档](../guides/)
- [修复总结](./EXAMPLES_FIXES.md)
