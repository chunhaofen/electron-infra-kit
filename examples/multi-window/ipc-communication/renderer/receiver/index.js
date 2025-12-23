const log = document.getElementById('log')

window.api.onMessage((data) => {
  log.innerHTML += `<p style="color:green">[${new Date().toLocaleTimeString()}] 收到: <b>${data.text}</b></p>`
})
