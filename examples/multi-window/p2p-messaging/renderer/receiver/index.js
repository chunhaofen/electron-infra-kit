const messageBus = window.messageBus;
const log = document.getElementById('log');

function addLog(msg) {
    const div = document.createElement('div');
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    div.style.borderBottom = '1px solid #eee';
    log.appendChild(div);
}

// 监听 P2P 消息
messageBus.on('p2p-test-event', (data) => {
    addLog(`收到: "${data.text}" 来自 ${data.from}`);
});

addLog('等待消息中...');
