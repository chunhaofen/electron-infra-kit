const title = document.getElementById('title')

// 监听来自主进程的视频 ID
window.api.on('load-video', ({ videoId }) => {
  if (title) {
    title.textContent = `正在播放 ${videoId}`
  }
  console.log('加载视频:', videoId)
})

// 初始显示
if (title) {
  title.textContent = '等待视频...'
}
