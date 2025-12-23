document.getElementById('submit-btn').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const age = parseInt(document.getElementById('age').value);
    const email = document.getElementById('email').value || undefined;

    const resultDiv = document.getElementById('result');
    resultDiv.textContent = '提交中...';
    resultDiv.className = '';

    try {
        const res = await window.api.createUser({ username, age, email });
        resultDiv.textContent = `成功: ${JSON.stringify(res, null, 2)}`;
        resultDiv.className = 'success';
    } catch (err) {
        // 错误信息通常在 err.message 中
        console.error(err);
        // 处理 Zod 错误信息
        let msg = err.message;
        if (msg.includes('Error invoking remote method')) {
             msg = msg.replace('Error invoking remote method \'user:create\': ', '');
        }
        resultDiv.textContent = `验证失败: ${msg}`;
        resultDiv.className = 'error';
    }
});
