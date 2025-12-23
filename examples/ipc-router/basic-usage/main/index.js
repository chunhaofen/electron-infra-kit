import path from 'path'
import { app } from 'electron'
import { createElectronToolkit, IpcHandler } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 1. 模拟基础设施
const mockApp = {
    quit: () => {
        console.log('App is quitting...')
        app.quit()
    },
    getVersion: () => app.getVersion()
};

// 2. 初始化 Toolkit
app.whenReady().then(() => {
    const { windowManager, ipcRouter } = createElectronToolkit({
        ipc: { autoInit: true },
        defaultConfig: {
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        }
    });

    // 注入依赖
    ipcRouter.addApi('app', mockApp);
    ipcRouter.addApi('windowManager', windowManager);

    // 3. 定义业务处理器

    // 示例 A: 简单的计算服务
    const mathHandler = new IpcHandler('math-add', 'invoke', (api, data) => {
        return data.a + data.b;
    });

    // 示例 B: 依赖外部 API 的服务 (控制窗口)
    const windowControlHandler = new IpcHandler('window-control', 'invoke', (api, data) => {
        const { action, winName } = data;
        const win = api.windowManager.getWindowByName(winName);

        if (!win) return { success: false, error: 'Window not found' };

        if (action === 'minimize') {
            win.minimize();
            return { success: true };
        }

        if (action === 'maximize') {
            if (win.isMaximized()) win.unmaximize();
            else win.maximize();
            return { success: true };
        }

        return { success: false, error: 'Unknown action' };
    });

    // 示例 C: 获取应用信息的服务
    const appInfoHandler = new IpcHandler('app-info', 'invoke', (api) => {
        return {
            version: api.app.getVersion(),
            env: process.env.NODE_ENV || 'development'
        };
    });

    // 4. 注册处理器
    ipcRouter.addHandlers([mathHandler, windowControlHandler, appInfoHandler]);

    // 创建主窗口
    windowManager.create({
        name: 'main',
        title: 'IPC Router 基础示例',
        width: 600,
        height: 600,
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
