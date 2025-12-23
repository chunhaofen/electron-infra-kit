
window.api.on('message-bus:data-changed', (event) => {
  if (event.key === 'theme') {
    const status = document.getElementById('status')
    status.innerText = '当前主题: ' + event.value
    document.body.style.backgroundColor =
      event.value === 'dark' ? '#333' : '#fff'
    document.body.style.color = event.value === 'dark' ? '#fff' : '#000'
  }
})
