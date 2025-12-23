import path from 'path'
import { app } from 'electron'
import { fileURLToPath } from 'url'
import { createElectronToolkit } from 'electron-infra-kit'
import handlers from './handlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Debug Mode 示例: 展示 DebugHelper 的使用

app.whenReady().then(() => {
  const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
    isDevelopment: true, // 启用开发模式
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

  // 注册所有 Handlers
  ipcRouter.addHandlers(handlers)

  // 初始化 MessageBus
  messageBus.initializeListener()
  messageBus.setData('debugInfo', {
    mode: 'development',
    features: ['windowManager', 'ipcRouter', 'messageBus'],
  })

  // 创建主窗口
  const mainId = windowManager.create({
    name: 'main',
    title: '调试模式演示',
    loadFile: path.join(__dirname, '../renderer/index.html')
  })

  const mainWin = windowManager.getWindowById(mainId)
  if (mainWin) {
    messageBus.registerWindow(mainId, mainWin)
    // 自动打开 DevTools
    mainWin.webContents.openDevTools()
  }

  console.log('🐛 调试模式已启用!')
  console.log('📝 打开 DevTools 控制台并输入: __ELECTRON_TOOLKIT_DEBUG__')
  console.log('📝 可用实例: windowManager, ipcRouter, messageBus')
})

app.on('window-all-closed', () => {
  app.quit()
})
