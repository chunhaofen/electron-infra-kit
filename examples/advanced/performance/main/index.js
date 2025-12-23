import path from 'path'
import { app } from 'electron'
import { fileURLToPath } from 'url'
import { createElectronToolkit, EnhancedDebugHelper } from 'electron-infra-kit'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * 性能优化示例
 * 
 * 本示例演示：
 * - 性能监控
 * - MessageBus 高效使用
 * - 窗口状态持久化优化
 * - 批量操作
 */

app.whenReady().then(async () => {
    const debug = EnhancedDebugHelper.getInstance();
    
    // 启用性能监控
    debug.enablePerformanceMonitoring();
    
    const { windowManager, ipcRouter, messageBus } = createElectronToolkit({
        isDevelopment: true,
        defaultConfig: {
            width: 1000,
            height: 700,
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                contextIsolation: true,
                nodeIntegration: false,
            },
        },
        // 启用窗口状态持久化
        store: {
            enablePersistence: true,
        },
    });

    // 注册组件用于调试
    debug.register('windowManager', windowManager);
    debug.register('ipcRouter', ipcRouter);
    debug.register('messageBus', messageBus);

    // 初始化 MessageBus
    messageBus.initializeListener();
    messageBus.setData('counter', 0);
    messageBus.setData('theme', 'light');

    // 性能测试 Handler
    ipcRouter.addHandler({
        name: 'perf:heavy-operation',
        callback: async () => {
            const timer = debug.createTimer('heavy-operation');
            
            // 模拟耗时操作
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 计算斐波那契数列
            function fib(n) {
                if (n <= 1) return n;
                return fib(n - 1) + fib(n - 2);
            }
            const result = fib(30);
            
            timer();
            return { result, message: '操作完成' };
        },
    });

    // 批量操作 Handler
    ipcRouter.addHandler({
        name: 'perf:batch-operation',
        callback: async (context, { count }) => {
            const timer = debug.createTimer('batch-operation');
            
            const results = [];
            for (let i = 0; i < count; i++) {
                results.push(i * 2);
            }
            
            timer();
            return { results, count: results.length };
        },
    });

    // 获取性能统计
    ipcRouter.addHandler({
        name: 'perf:get-stats',
        callback: async () => {
            const stats = debug.getStatistics();
            return { stats };
        },
    });

    // 清除性能指标
    ipcRouter.addHandler({
        name: 'perf:clear-metrics',
        callback: async () => {
            debug.clearMetrics();
            return { message: '性能指标已清除' };
        },
    });

    // 创建窗口
    windowManager.create({
        name: 'main',
        title: '性能优化示例',
        loadFile: path.join(__dirname, '../renderer/index.html')
    });
});

app.on('window-all-closed', () => {
    app.quit();
});
