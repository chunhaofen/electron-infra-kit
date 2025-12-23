// 使用 preload 暴露的安全 API
const messageBus = window.messageBus;

const readonlyVal = document.getElementById('readonly-val');
const publicVal = document.getElementById('public-val');
const permError = document.getElementById('perm-error');
const transStatus = document.getElementById('trans-status');

// 监听数据变更
messageBus.subscribe('readonly-key', ({ value }) => {
    console.log('更新 readonly-key:', value);
    readonlyVal.textContent = value;
});

messageBus.subscribe('public-data', ({ value }) => {
    console.log('更新 public-data:', value);
    publicVal.textContent = value;
});

// 初始化显示
readonlyVal.textContent = messageBus.getData('readonly-key') || 'N/A';
publicVal.textContent = messageBus.getData('public-data') || 'N/A';

// 1. 测试权限控制
document.getElementById('try-modify-btn').addEventListener('click', async () => {
    try {
        console.log('尝试修改只读键...');
        await messageBus.setData('readonly-key', '新值');
        permError.textContent = '成功？这不应该发生！';
    } catch (err) {
        console.error('预期错误:', err);
        permError.textContent = `被阻止: ${err.message || '权限不足'}`;
    }
});

// 2. 测试事务
document.getElementById('transaction-btn').addEventListener('click', async () => {
    transStatus.textContent = '事务已开始...';

    try {
        // 开启事务
        const transactionId = messageBus.startTransaction();
        if (!transactionId) {
            transStatus.textContent = '事务功能未在客户端启用';
            return;
        }

        // 在事务中修改数据 (此时其他窗口还看不到变更)
        await messageBus.setData('public-data', '事务进行中...', { transactionId });

        // 模拟一些耗时操作
        await new Promise(r => setTimeout(r, 1000));

        // 提交事务
        messageBus.commitTransaction(transactionId);
        transStatus.textContent = '事务已提交！';
    } catch (err) {
        transStatus.textContent = `事务失败: ${err.message}`;
    }
});
