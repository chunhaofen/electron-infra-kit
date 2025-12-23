import path from 'path'
import { app } from 'electron'
import { createElectronToolkit, IpcHandler } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 模拟数据库
const db = new Map([
    [1, { name: 'Alice', role: 'admin' }],
    [2, { name: 'Bob', role: 'user' }]
]);

// 模拟配置存储
const configStore = new Map([['theme', 'light']]);

// 模块 A: 用户服务
const createUserService = () => {
    return [
        new IpcHandler('user:get', 'invoke', (api, data) => {
            api.logger.info(`获取用户 ${data.id}`);
            return api.db.get(data.id) || null;
        }),
        new IpcHandler('user:create', 'invoke', (api, data) => {
            const newId = Date.now();
            api.db.set(newId, data);
            api.logger.info(`用户已创建: ${newId}`);
            return { id: newId, ...data };
        })
    ];
};

// 模块 B: 系统设置服务
const createSettingsService = () => {
    return [
        new IpcHandler('settings:theme', 'invoke', (api, data) => {
            if (data.action === 'set') {
                api.config.set('theme', data.value);
                // 通知所有窗口
                // 注意：api.windowManager 是 toolkit 提供的真实实例
                // 我们可以使用 messageBus 或者直接 webContents.send
                // 这里我们假设 messageBus 已经注入或者通过 windowManager 获取
                return true;
            }
            return api.config.get('theme');
        })
    ];
};

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

    // 1. 准备依赖
    const logger = {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg) => console.error(`[ERROR] ${msg}`)
    };

    const config = {
        get: (k) => configStore.get(k),
        set: (k, v) => configStore.set(k, v)
    };

    // 2. 批量注入依赖
    ipcRouter.addApis({
        logger,
        config,
        db, // 注入 Map 作为 DB
        windowManager // 注入 toolkit 的 windowManager
    });

    // 3. 加载业务模块
    ipcRouter.addHandlers(createUserService());
    ipcRouter.addHandlers(createSettingsService());

    // 创建主窗口
    windowManager.create({
        name: 'main',
        title: '依赖注入示例',
        width: 800,
        height: 600,
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
