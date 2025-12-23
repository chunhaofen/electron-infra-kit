const input = document.getElementById('msgInput')
const logEl = document.getElementById('log')

document.getElementById('send').onclick = async () => {
  const text = input.value
  logEl.textContent += `\n[本地] -> ${text}`
  const res = await window.api.sendMessage(text)
  logEl.textContent += `\n[主进程] 响应: ${JSON.stringify(res)}`
}
