import path from 'path'
import { app } from 'electron'
import { createElectronToolkit, IpcHandler } from 'electron-infra-kit'
import { z } from 'zod'
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
        }
    });

    // 1. 定义 Schema
    const createUserSchema = z.object({
        username: z.string().min(3, '用户名至少需要3个字符'),
        age: z.number().min(18, '必须年满18岁').max(100),
        email: z.string().email('邮箱格式不正确').optional()
    });

    // 2. 创建带 Schema 的 Handler
    const createUserHandler = new IpcHandler(
        'user:create',     // Handler Name
        'invoke',          // Event Type
        (api, data) => {   // Callback
            // 此时 data 已经被验证且类型安全
            console.log('[成功] 创建用户:', data);
            return { id: Date.now(), ...data };
        },
        createUserSchema   // <--- 传入 Schema
    );

    ipcRouter.addHandler(createUserHandler);

    // 创建主窗口
    windowManager.create({
        name: 'main',
        title: 'Schema 验证示例',
        width: 600,
        height: 600,
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
