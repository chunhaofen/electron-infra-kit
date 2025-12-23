import { IpcHandler } from 'electron-infra-kit'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default (messageBus) => {
  const handlers = []

  // 打开设置窗口 (单例)
  handlers.push(new IpcHandler(
    'openSettings',
    'window',
    async (api) => {
      const existingWin = api.windowManager.getWindowByName('settings')
      if (existingWin) {
        existingWin.focus()
        const id = api.windowManager.getWindowByNameId('settings')
        return { id, existed: true }
      }

      const id = api.windowManager.create({
        name: 'settings',
        title: '设置',
        width: 600,
        height: 500,
        resizable: false,
        loadFile: path.join(__dirname, '../renderer/settings/index.html')
      })

      const win = api.windowManager.getWindowById(id)
      if (win) {
        // 注册 MessageBus 端口
        messageBus.registerWindow(id, win)
      }

      return { id, existed: false }
    }
  ))

  // 打开关于窗口 (单例)
  handlers.push(new IpcHandler(
    'openAbout',
    'window',
    async (api) => {
      const existingWin = api.windowManager.getWindowByName('about')
      if (existingWin) {
        existingWin.focus()
        const id = api.windowManager.getWindowByNameId('about')
        return { id, existed: true }
      }

      const id = api.windowManager.create({
        name: 'about',
        title: '关于',
        width: 400,
        height: 300,
        resizable: false,
        loadFile: path.join(__dirname, '../renderer/about/index.html')
      })

      return { id, existed: false }
    }
  ))

  // 获取系统信息
  handlers.push(new IpcHandler(
    'getSystemInfo',
    'system',
    async () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        electron: process.versions.electron,
        memory: process.getSystemMemoryInfo(),
      }
    }
  ))

  return handlers
}
