import { app } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { createElectronToolkit } from 'electron-infra-kit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 示例 1: 基础窗口创建与管理（main.ts 入口）

app.whenReady().then(() => {
    const { windowManager, ipcRouter } = createElectronToolkit({
        defaultConfig: {
            width: 1024,
            height: 768,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        },
        ipc: { autoInit: true },
    })

    // 打开第二个窗口的 handler
    ipcRouter.addHandler({
        name: 'open-second-window',
        callback: () => {
            const id = windowManager.create({
                name: 'second',
                title: '第二个窗口 (单例模式)',
                width: 400,
                height: 300,
                alwaysOnTop: true,
            })
            return { id }
        },
    })

    // 创建主窗口并直接加载文件
    windowManager.create({
        name: 'main',
        title: '主窗口',
        loadFile: path.join(__dirname, '../renderer/index.html')
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
