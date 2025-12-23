// Settings Window Script

const windowId = 'settings'

async function init() {
  // 订阅配置
  await window.messageBus.subscribe(windowId, ['appConfig'])

  // 加载当前配置
  const config = await window.messageBus.getData('appConfig')
  if (config) {
    document.getElementById('theme').value = config.theme || 'light'
    document.getElementById('language').value = config.language || 'en'
    document.getElementById('notifications').checked = config.notifications !== false
    document.getElementById('autoUpdate').checked = config.autoUpdate !== false
  }

  // 监听配置变化
  window.messageBus.onStateChange((event) => {
    if (event.key === 'appConfig' && event.value) {
      document.getElementById('theme').value = event.value.theme || 'light'
      document.getElementById('language').value = event.value.language || 'en'
      document.getElementById('notifications').checked = event.value.notifications !== false
      document.getElementById('autoUpdate').checked = event.value.autoUpdate !== false
    }
  })
}

window.saveSettings = async function() {
  const config = {
    theme: document.getElementById('theme').value,
    language: document.getElementById('language').value,
    notifications: document.getElementById('notifications').checked,
    autoUpdate: document.getElementById('autoUpdate').checked,
  }

  try {
    // 我们这里直接通过 messageBus 更新状态
    // 在实际应用中，可能需要调用主进程 API 来持久化保存
    await window.messageBus.setData('appConfig', config, windowId)
    showNotification('设置保存成功!')
  } catch (error) {
    showNotification('保存失败: ' + error.message)
  }
}

function showNotification(message) {
  // 简单的通知实现
  const notification = document.createElement('div')
  notification.textContent = message
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4ade80;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
  `
  document.body.appendChild(notification)
  
  setTimeout(() => {
    notification.remove()
  }, 3000)
}

init()
