// 1. 数学计算
document.getElementById('calc-btn').addEventListener('click', async () => {
    const res = await window.api.calculate(10, 20);
    document.getElementById('calc-res').textContent = `10 + 20 = ${res}`;
});

// 2. 窗口控制
document.getElementById('min-btn').addEventListener('click', async () => {
    await window.api.controlWindow('minimize', 'main');
});

document.getElementById('max-btn').addEventListener('click', async () => {
    await window.api.controlWindow('maximize', 'main');
});

// 3. 获取应用信息
document.getElementById('info-btn').addEventListener('click', async () => {
    const info = await window.api.getAppInfo();
    document.getElementById('info-res').textContent = JSON.stringify(info, null, 2);
});
