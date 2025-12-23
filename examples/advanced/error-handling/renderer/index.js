// 显示结果
function showResult(elementId, message, isError = false) {
    const el = document.getElementById(elementId);
    el.textContent = message;
    el.className = 'result ' + (isError ? 'error' : 'success');
    el.style.display = 'block';
    
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

// 创建用户
async function createUser() {
    const name = document.getElementById('userName').value;
    const email = document.getElementById('userEmail').value;
    
    try {
        const result = await window.ipcApi.invoke('user:create', { name, email });
        showResult('createResult', `✅ 用户创建成功: ${result.user.name}`);
        document.getElementById('userName').value = '';
        document.getElementById('userEmail').value = '';
        loadUsers();
    } catch (error) {
        showResult('createResult', `❌ ${error.message}`, true);
    }
}

// 获取用户
async function getUser() {
    const id = parseInt(document.getElementById('getUserId').value);
    
    try {
        const result = await window.ipcApi.invoke('user:get', { id });
        showResult('getResult', `✅ 找到用户: ${result.user.name} (${result.user.email})`);
    } catch (error) {
        showResult('getResult', `❌ ${error.message}`, true);
    }
}

// 删除用户
async function deleteUser() {
    const id = parseInt(document.getElementById('deleteUserId').value);
    
    try {
        const result = await window.ipcApi.invoke('user:delete', { id });
        showResult('deleteResult', `✅ ${result.message}`);
        document.getElementById('deleteUserId').value = '';
        loadUsers();
    } catch (error) {
        showResult('deleteResult', `❌ ${error.message}`, true);
    }
}

// 加载用户列表
async function loadUsers() {
    try {
        const result = await window.ipcApi.invoke('user:list', {});
        const listEl = document.getElementById('userList');
        
        if (result.users.length === 0) {
            listEl.innerHTML = '<li style="text-align:center;color:#999;">暂无用户</li>';
            return;
        }
        
        listEl.innerHTML = result.users.map(user => `
            <li class="user-item">
                <div class="user-info">
                    <div class="user-name">
                        ${user.name}
                        <span class="user-role ${user.role}">${user.role}</span>
                    </div>
                    <div class="user-email">${user.email}</div>
                </div>
                <div>ID: ${user.id}</div>
            </li>
        `).join('');
    } catch (error) {
        console.error('加载用户列表失败:', error);
    }
}

// 页面加载时获取用户列表
window.addEventListener('DOMContentLoaded', () => {
    loadUsers();
});

// Make global
window.createUser = createUser;
window.getUser = getUser;
window.deleteUser = deleteUser;
window.loadUsers = loadUsers;
