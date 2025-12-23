import path from 'path'
import { app } from 'electron'
import { fileURLToPath } from 'url'
import { createElectronToolkit } from 'electron-infra-kit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 示例 4: 插件系统与生命周期钩子
// 使用 LoggerPlugin 和 WindowGuardPlugin 打印窗口生命周期日志

const LoggerPlugin = {
  name: 'LoggerPlugin',
  onInit(wm) {
    console.log('[LoggerPlugin] 初始化...')
  },
  onWillCreate(config) {
    console.log(`[LoggerPlugin] 准备创建窗口: ${config.name || 'unnamed'}`)
  },
  onDidCreate({ id, name }) {
    console.log(`[LoggerPlugin] 窗口已创建: ${name} (ID: ${id})`)
  },
  onWillDestroy(id) {
    console.log(`[LoggerPlugin] 窗口即将销毁: ${id}`)
  },
  onDidDestroy(id) {
    console.log(`[LoggerPlugin] 窗口已销毁: ${id}`)
  },
}

const WindowGuardPlugin = {
  name: 'WindowGuardPlugin',
  onWillCreate(config) {
    if (config.name === 'forbidden-window') {
      console.warn('[WindowGuardPlugin] 拦截了禁止创建的窗口!')
      return false
    }
    if (!config.backgroundColor) {
      config.backgroundColor = '#ffffff'
    }
    return config
  },
}

app.whenReady().then(() => {
  const { windowManager } = createElectronToolkit({
    plugins: [LoggerPlugin],
    hooks: {
      onDidCreate: ({ name }) => {
        console.log(`[Hooks] 收到通知: ${name} 上线了`)
      },
    },
    defaultConfig: {
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true
      },
    },
  })

  // 动态添加第二个插件
  windowManager.use(WindowGuardPlugin)

  console.log('--- 1. 创建正常窗口 ---')
  const mainId = windowManager.create({
    name: 'main',
    title: '主窗口',
    loadFile: path.join(__dirname, '../renderer/index.html')
  })

  console.log('\n--- 2. 尝试创建被禁止的窗口 ---')
  const forbiddenId = windowManager.create({
    name: 'forbidden-window',
    title: '不应打开的窗口',
  })
  if (!forbiddenId) {
    console.log('-> 验证成功: 窗口创建被拦截返回空字符串')
  } else {
    console.error('-> 验证失败: 窗口未被拦截')
  }

  console.log('\n--- 3. 验证配置修改 (默认背景色) ---')
  const secondId = windowManager.create({
    name: 'second',
    title: '第二个窗口',
    loadFile: path.join(__dirname, '../renderer/index.html')
  })

  console.log('\n--- 4. 关闭窗口触发销毁钩子 ---')
  setTimeout(() => {
    windowManager.removeWindow(secondId)
  }, 2000)
})

app.on('window-all-closed', () => {
  app.quit()
})
