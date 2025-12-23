// 获取用户
document.getElementById('get-user-btn').addEventListener('click', async () => {
    const id = parseInt(document.getElementById('user-id').value);
    const user = await window.api.getUser(id);
    document.getElementById('user-res').textContent = JSON.stringify(user, null, 2);
});

// 创建用户
document.getElementById('create-user-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-user-name').value;
    const user = await window.api.createUser(name);
    document.getElementById('create-res').textContent = `Created: ${JSON.stringify(user)}`;
});

// 主题设置
document.getElementById('theme-btn').addEventListener('click', async () => {
    const current = await window.api.getTheme();
    const next = current === 'light' ? 'dark' : 'light';
    await window.api.setTheme(next);

    document.body.style.backgroundColor = next === 'dark' ? '#333' : '#fff';
    document.body.style.color = next === 'dark' ? '#fff' : '#000';
    document.getElementById('theme-status').textContent = next;
});

// 初始化主题
(async () => {
    const theme = await window.api.getTheme();
    document.getElementById('theme-status').textContent = theme;
    document.body.style.backgroundColor = theme === 'dark' ? '#333' : '#fff';
    document.body.style.color = theme === 'dark' ? '#fff' : '#000';
})();
