import path from 'path'
import { app } from 'electron'
import { createElectronToolkit, IpcHandler } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.whenReady().then(() => {
    const { windowManager, ipcRouter } = createElectronToolkit({
        ipc: { autoInit: true },
        defaultConfig: {
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: path.join(__dirname, '../preload/index.js')
            }
        },
        // 可以在初始化时设置默认限流策略
        defaultRateLimit: {
            windowMs: 1000, // 1秒窗口
            max: 5          // 最多5次调用
        }
    });

    // 1. 定义一个高频调用的 Handler
    const heavyTaskHandler = new IpcHandler('heavy-task', 'invoke', (api, data) => {
        console.log('执行任务...');
        return { status: '完成', timestamp: Date.now() };
    });

    ipcRouter.addHandler(heavyTaskHandler);

    // 2. 为特定 Handler 单独设置限流 (覆盖默认值)
    // 限制 'heavy-task' 每 2 秒只能调用 3 次
    ipcRouter.setRateLimit('heavy-task', {
        windowMs: 2000,
        max: 3
    });

    // 创建主窗口
    windowManager.create({
        name: 'main',
        title: '限流 (Rate Limiting) 示例',
        width: 600,
        height: 600,
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
