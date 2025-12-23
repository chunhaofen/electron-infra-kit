const logEl = document.getElementById('log')

document.getElementById('dark').onclick = () => {
  window.api.send('set-data', { key: 'theme', value: 'dark' })
  logEl.textContent += '\n[控制器] 设置主题为深色'
}

document.getElementById('light').onclick = () => {
  window.api.send('set-data', { key: 'theme', value: 'light' })
  logEl.textContent += '\n[控制器] 重置主题为浅色'
}
