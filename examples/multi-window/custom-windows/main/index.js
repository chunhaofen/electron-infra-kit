import path from 'path'
import { app } from 'electron'
import { createElectronToolkit } from 'electron-infra-kit'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 示例 3: 自定义窗口管理
// 演示如何创建不同类型的窗口（登录窗口、播放器窗口）

app.whenReady().then(() => {
    const { windowManager } = createElectronToolkit({
        defaultConfig: {
            webPreferences: {
                preload: path.join(__dirname, '../preload/index.js'),
                nodeIntegration: false,
                contextIsolation: true,
            },
        },
    })

    // 创建登录窗口
    function showLoginWindow() {
        const id = windowManager.create({
            name: 'login-core',
            title: '用户登录',
            width: 300,
            height: 450,
            frame: false,
            resizable: false,
            alwaysOnTop: true,
            loadFile: path.join(__dirname, '../renderer/login/index.html')
        })
        return id
    }

    // 创建播放器窗口
    function playVideo(videoId) {
        const id = windowManager.create({
            name: `player-${videoId}`,
            title: `正在播放: ${videoId}`,
            width: 800,
            height: 500,
            backgroundColor: '#000',
            titleBarStyle: 'hiddenInset',
            loadFile: path.join(__dirname, '../renderer/player/index.html')
        })

        // 加载完成后传递视频 ID
        const win = windowManager.getWindowById(id)
        if (win) {
            win.webContents.on('did-finish-load', () => {
                win.webContents.send('load-video', { videoId })
            })
        }

        return id
    }

    console.log('1. 打开登录窗口...')
    showLoginWindow()

    setTimeout(() => {
        console.log('2. 模拟打开播放器...')
        playVideo('video-001')
    }, 1500)

    setTimeout(() => {
        console.log('3. 再次打开同一个视频 (应聚焦旧窗口)...')
        const existingWin = windowManager.getWindowByName('player-video-001')
        if (existingWin) {
            existingWin.focus()
            console.log('-> 窗口已存在，聚焦成功')
        } else {
            playVideo('video-001')
        }
    }, 3000)
})

app.on('window-all-closed', () => {
    app.quit()
})
