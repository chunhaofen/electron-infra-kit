import path from 'path'
import { app } from 'electron'
import { createElectronToolkit } from 'electron-infra-kit'
import createHandlers from './handlers.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Production Ready App: 综合示例

app.whenReady().then(() => {
  const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
    defaultConfig: {
      width: 1000,
      height: 700,
      webPreferences: {
        // [Feature: Auto Preload Registration]
        // 在 defaultConfig 中配置 preload，所有通过 windowManager.create 创建的窗口
        // 都会自动应用此 preload 脚本，无需重复指定。
        preload: path.join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
      },
    },
  })

  // 1. 初始化 MessageBus 数据
  messageBus.initializeListener()

  // 设置初始状态
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

  // 2. 注册 IPC Handlers
  const handlers = createHandlers(messageBus)
  handlers.forEach(handler => ipcRouter.addHandler(handler))

  // 3. 创建主窗口
  const mainId = windowManager.create({
    name: 'main',
    title: '生产级应用示例',
    loadFile: path.join(__dirname, '../renderer/main/index.html')
  })

  const mainWin = windowManager.getWindowById(mainId)
  if (mainWin) {
    messageBus.registerWindow(mainId, mainWin)
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
