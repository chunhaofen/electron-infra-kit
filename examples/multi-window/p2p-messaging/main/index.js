import path from 'path'
import { app } from 'electron'
import { createElectronToolkit } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.whenReady().then(() => {
    const { windowManager, messageBus } = createElectronToolkit({
        ipc: { autoInit: true },
        defaultConfig: {
            width: 400, height: 500,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        }
    });

    // 创建发送者窗口
    const senderWin = windowManager.create({
        name: 'sender',
        title: '发送者窗口',
        x: 100, y: 100,
        loadFile: path.join(__dirname, '../renderer/sender/index.html')
    });

    // 创建接收者窗口
    const receiverWin = windowManager.create({
        name: 'receiver',
        title: '接收者窗口',
        x: 520, y: 100,
        loadFile: path.join(__dirname, '../renderer/receiver/index.html')
    });

    console.log('窗口已创建。发送者 ID:', senderWin, '接收者 ID:', receiverWin);
});

app.on('window-all-closed', () => {
    app.quit();
});
