// Renderer Script

async function testIpc() {
  try {
    const result = await window.ipcApi.invoke('testAction', { name: '开发者' })
    document.getElementById('result').textContent = 
      JSON.stringify(result, null, 2)
  } catch (error) {
    document.getElementById('result').textContent = 
      `错误: ${error.message}`
  }
}

async function createWindow() {
  document.getElementById('result').textContent = 
    '正在创建窗口... (请查看控制台调试信息)'
  
  // This would normally be an IPC call
  console.log('请求创建窗口')
}

async function getDebugInfo() {
  document.getElementById('result').textContent = 
    '调试模式已启用!\n\n' +
    '打开 DevTools 控制台并输入:\n' +
    '__ELECTRON_TOOLKIT_DEBUG__\n\n' +
    '这将显示所有可用的调试实例。'
}

// Log to console
console.log('🐛 调试模式激活')
console.log('输入 __ELECTRON_TOOLKIT_DEBUG__ 访问调试实例')

// Make functions global so they can be called from HTML
window.testIpc = testIpc
window.createWindow = createWindow
window.getDebugInfo = getDebugInfo
