import path from 'path'
import { app, ipcMain } from 'electron'
import { createElectronToolkit } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// MessageBus 基础同步示例
// 控制窗口通过 IPC 通知主进程，主进程调用 messageBus.setData 同步到接收窗口

app.whenReady().then(() => {
    const { windowManager, messageBus } = createElectronToolkit({
        defaultConfig: {
            width: 800,
            height: 600,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                nodeIntegration: false,
                contextIsolation: true,
            },
        },
    })

    // 1. 创建控制窗口
    const controllerId = windowManager.create({
        name: 'controller',
        title: '主窗口 - 控制器',
        width: 800,
        height: 600,
        loadFile: path.join(__dirname, '../renderer/controller/index.html')
    })

    // 2. 创建接收窗口
    const receiverId = windowManager.create({
        name: 'receiver',
        title: '第二窗口 - 接收器',
        width: 600,
        height: 400,
        x: 100,
        y: 100,
        loadFile: path.join(__dirname, '../renderer/receiver/index.html')
    })

    // 3. IPC: 从控制窗口接收主题变更，并通过 MessageBus 同步
    ipcMain.on('set-data', (_event, { key, value }) => {
        console.log(`设置 ${key} 为 ${value}`)
        messageBus.setData(key, value)
    })
})

app.on('window-all-closed', () => {
    app.quit()
})
