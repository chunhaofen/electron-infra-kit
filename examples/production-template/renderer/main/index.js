// Main Window Script

const windowId = 'main'

async function init() {
  // 订阅状态
  await window.messageBus.subscribe(windowId, ['appConfig', 'userSession'])

  // 加载初始数据
  const config = await window.messageBus.getData('appConfig')
  const session = await window.messageBus.getData('userSession')

  updateUI(config, session)

  // 监听状态变化
  window.messageBus.onStateChange((event) => {
    console.log('State changed:', event)
    if (event.key === 'appConfig' || event.key === 'userSession') {
      window.messageBus.getData('appConfig').then(config => {
        window.messageBus.getData('userSession').then(session => {
          updateUI(config, session)
        })
      })
    }
  })
}

function updateUI(config, session) {
  if (session) {
    document.getElementById('userInfo').textContent = 
      `👤 ${session.username} (已登录)`
  }
  
  if (config) {
    document.getElementById('configInfo').textContent = 
      `🎨 ${config.theme} | 🌐 ${config.language}`
  }
}

window.openSettings = async function() {
  try {
    await window.ipcApi.invoke('openSettings')
  } catch (error) {
    console.error('Failed to open settings:', error)
  }
}

window.openAbout = async function() {
  try {
    await window.ipcApi.invoke('openAbout')
  } catch (error) {
    console.error('Failed to open about:', error)
  }
}

window.getSystemInfo = async function() {
  try {
    const info = await window.ipcApi.invoke('getSystemInfo')
    alert(`系统信息:\n\n${JSON.stringify(info, null, 2)}`)
  } catch (error) {
    console.error('Failed to get system info:', error)
  }
}

init()
