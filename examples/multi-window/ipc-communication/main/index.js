import path from 'path'
import { app } from 'electron'
import { createElectronToolkit } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 示例 2: 窗口间通信 (IPC)
// 发送方 -> 主进程 (ipcRouter) -> 接收方 (windowManager.send)

app.whenReady().then(() => {
    const { windowManager, ipcRouter } = createElectronToolkit({
        ipc: { autoInit: true },
        defaultConfig: {
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                nodeIntegration: false,
                contextIsolation: true,
            },
        },
    })

    // 1. 注册转发 handler
    ipcRouter.addHandler({
        name: 'send-to-receiver',
        callback: (_api, data) => {
            const { text } = data
            const receiverWin = windowManager.getWindowByName('receiver')
            if (receiverWin) {
                receiverWin.webContents.send('custom-event', { text, from: 'sender' })
            }
            return { success: true }
        },
    })

    // 2. 创建接收方并加载文件
    windowManager.create({
        name: 'receiver',
        title: '接收方',
        x: 100,
        y: 100,
        width: 400,
        height: 400,
        loadFile: path.join(__dirname, '../renderer/receiver/index.html')
    })

    // 3. 创建发送方并加载文件
    windowManager.create({
        name: 'sender',
        title: '发送方',
        x: 520,
        y: 100,
        width: 400,
        height: 400,
        loadFile: path.join(__dirname, '../renderer/sender/index.html')
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})
