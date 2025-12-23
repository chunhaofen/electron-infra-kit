import path from 'path'
import { app } from 'electron'
import { fileURLToPath } from 'url'
import { createElectronToolkit } from 'electron-infra-kit'
import {
    ValidationError,
    NotFoundError,
    PermissionError
} from 'electron-infra-kit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 错误处理示例
 * 
 * 本示例演示：
 * - 使用 StandardError 类
 * - IPC 错误处理
 * - 从主进程到渲染进程的错误传播
 * - 用户友好的错误消息
 */

// 用户数据模拟
const users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com', role: 'admin' },
    { id: 2, name: '李四', email: 'lisi@example.com', role: 'user' },
];

app.whenReady().then(async () => {
    const { windowManager, ipcRouter } = createElectronToolkit({
        isDevelopment: true,
        defaultConfig: {
            width: 900,
            height: 700,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        },
    });

    // 1. 验证错误示例
    ipcRouter.addHandler({
        name: 'user:create',
        callback: async (context, payload) => {
            // 验证输入
            if (!payload.name || payload.name.trim() === '') {
                throw new ValidationError('用户名不能为空', { field: 'name' });
            }

            if (!payload.email || !payload.email.includes('@')) {
                throw new ValidationError('邮箱格式不正确', { field: 'email' });
            }

            // 创建用户
            const newUser = {
                id: users.length + 1,
                name: payload.name,
                email: payload.email,
                role: 'user'
            };
            users.push(newUser);

            return { success: true, user: newUser };
        },
    });

    // 2. 未找到错误示例
    ipcRouter.addHandler({
        name: 'user:get',
        callback: async (context, payload) => {
            const user = users.find(u => u.id === payload.id);

            if (!user) {
                throw new NotFoundError(`用户 ID ${payload.id} 不存在`, { userId: payload.id });
            }

            return { success: true, user };
        },
    });

    // 3. 权限错误示例
    ipcRouter.addHandler({
        name: 'user:delete',
        callback: async (context, payload) => {
            const user = users.find(u => u.id === payload.id);

            if (!user) {
                throw new NotFoundError(`用户 ID ${payload.id} 不存在`, { userId: payload.id });
            }

            if (user.role === 'admin') {
                throw new PermissionError('不能删除管理员账户', { userId: payload.id, role: user.role });
            }

            const index = users.indexOf(user);
            users.splice(index, 1);

            return { success: true, message: `用户 ${user.name} 已删除` };
        },
    });

    // 4. 获取用户列表
    ipcRouter.addHandler({
        name: 'user:list',
        callback: async () => {
            return { success: true, users };
        }
    });

    // 创建窗口
    windowManager.create({
        name: 'main',
        title: '错误处理示例',
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
