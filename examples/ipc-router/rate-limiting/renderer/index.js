const logEl = document.getElementById('log');

function log(msg, isError = false) {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    if (isError) div.style.color = 'red';
    logEl.prepend(div);
}

document.getElementById('spam-btn').addEventListener('click', async () => {
    // 连续发送 5 次请求
    for (let i = 1; i <= 5; i++) {
        try {
            await window.api.invokeHeavyTask();
            log(`请求 ${i}: 成功`);
        } catch (err) {
            log(`请求 ${i}: 失败 - ${err.message}`, true);
        }
        // 稍微延迟，模拟快速点击
        await new Promise(r => setTimeout(r, 100));
    }
});
