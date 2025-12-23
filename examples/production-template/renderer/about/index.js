// About Window Script

async function init() {
  try {
    const info = await window.ipcApi.invoke('getSystemInfo')
    
    const html = Object.entries(info).map(([key, value]) => `
      <div class="info-item">
        <span class="info-label">${formatLabel(key)}</span>
        <span class="info-value">${value}</span>
      </div>
    `).join('')
    
    document.getElementById('systemInfo').innerHTML = html
  } catch (error) {
    document.getElementById('systemInfo').textContent = 
      '无法加载系统信息'
  }
}

function formatLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
}

init()
