const messageBus = window.messageBus;

document.getElementById('send-btn').addEventListener('click', async () => {
    const text = document.getElementById('msg-input').value;
    const status = document.getElementById('status');

    status.textContent = '发送中...';

    try {
        // 1. 获取目标窗口 ID (实际应用中可能通过某种注册表获取)
        // 这里我们假设我们知道接收者的名字是 'receiver'
        // 注意：在渲染进程直接调用 windowManager.getWindowByName 需要 IPC 支持或主进程配合
        // 但这里我们使用 MessageBus 的广播或直接 ID 发送
        
        // 为了演示 P2P，我们需要知道对方的 ID。
        // 我们可以先广播一个查询，或者在主进程告知。
        // 这里简化：我们使用 broadcast 发送给所有窗口，接收者自己过滤
        
        messageBus.emit('p2p-test-event', {
            from: 'sender',
            text: text,
            timestamp: Date.now()
        });
        
        status.textContent = '已通过广播发送！';

    } catch (err) {
        console.error(err);
        status.textContent = '错误: ' + err.message;
    }
});
