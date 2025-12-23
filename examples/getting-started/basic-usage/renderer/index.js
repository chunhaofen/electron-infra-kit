const btn = document.getElementById('open-second')
const logEl = document.getElementById('log')

btn.onclick = async () => {
  try {
    const res = await window.demo.openSecondWindow()
    logEl.textContent += `\n[OK] second window id: ${res?.id || 'unknown'}`
  } catch (e) {
    logEl.textContent += `\n[ERROR] ${e.message}`
  }
}
