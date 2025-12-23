import path from 'path'
import { app } from 'electron'
import { fileURLToPath } from 'url'
import { createElectronToolkit } from 'electron-infra-kit'
import handlers from './handlers.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 依赖注入高级示例: 注入 app、windowManager、模拟数据库

// 模拟数据库
class MockDatabase {
    constructor() {
        this.users = new Map([
            ['1', { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' }],
            ['2', { id: '2', name: 'Bob', email: 'bob@example.com', role: 'user' }],
            ['3', { id: '3', name: 'Charlie', email: 'charlie@example.com', role: 'user' }],
        ])
    }

    getUser(id) {
        return this.users.get(id)
    }

    getAllUsers() {
        return Array.from(this.users.values())
    }

    createUser(user) {
        const id = String(this.users.size + 1)
        const newUser = { id, ...user }
        this.users.set(id, newUser)
        return newUser
    }

    updateUser(id, updates) {
        const user = this.users.get(id)
        if (!user) return null
        const updated = { ...user, ...updates }
        this.users.set(id, updated)
        return updated
    }

    deleteUser(id) {
        return this.users.delete(id)
    }
}

app.whenReady().then(() => {
    const { windowManager, ipcRouter } = createElectronToolkit({
        defaultConfig: {
            width: 1000,
            height: 700,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        },
    })

    // 创建模拟数据库实例
    const db = new MockDatabase()

    // 注入依赖到 IpcRouter
    ipcRouter.addApi('app', app)
    ipcRouter.addApi('windowManager', windowManager)
    ipcRouter.addApi('db', db)

    // 注册所有 handlers
    ipcRouter.addHandlers(handlers)

    // 创建主窗口并直接加载文件
    windowManager.create({
        name: 'main',
        title: '依赖注入高级示例',
        loadFile: path.join(__dirname, '../renderer/index.html')
    })
})

app.on('window-all-closed', () => {
    app.quit()
})
