import path from 'path'
import { app } from 'electron'
import { createElectronToolkit, FieldPermission } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.whenReady().then(() => {
    const { windowManager, messageBus } = createElectronToolkit({
        ipc: { autoInit: true },
        defaultConfig: {
            width: 800, height: 600,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        }
    });

    // 1. 设置权限控制
    // ----------------
    // 'readonly-key' 只能被读取，不能被任何窗口修改
    messageBus.setPermission('readonly-key', FieldPermission.READ_ONLY);

    // 'admin-only' 只能被 ID 为 1 的窗口修改 (假设 admin 窗口 ID 为 1)
    // 注意：这里仅作演示，实际 ID 需要动态获取
    // messageBus.setPermission('admin-only', FieldPermission.WRITE_ONLY, [1]);

    // 初始化一些数据
    messageBus.setData('public-data', '初始公共数据');
    messageBus.setData('readonly-key', '此数据不可更改');

    // 2. 创建窗口
    // ----------------
    windowManager.create({
        name: 'main',
        title: '高级消息总线示例',
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
