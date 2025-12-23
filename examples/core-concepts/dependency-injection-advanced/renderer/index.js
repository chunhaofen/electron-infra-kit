// Renderer Script

async function getPath(name) {
  try {
    const result = await window.ipcApi.invoke('getAppPath', { name })
    document.getElementById('pathResult').textContent = 
      `${name}: ${result.path}`
  } catch (error) {
    document.getElementById('pathResult').textContent = 
      `错误: ${error.message}`
  }
}

async function loadUsers() {
  try {
    const users = await window.ipcApi.invoke('getUsers')
    displayUsers(users)
  } catch (error) {
    document.getElementById('userList').innerHTML = 
      `<div>错误: ${error.message}</div>`
  }
}

async function getUser(id) {
  try {
    const user = await window.ipcApi.invoke('getUser', { id })
    displayUsers([user])
  } catch (error) {
    document.getElementById('userList').innerHTML = 
      `<div>错误: ${error.message}</div>`
  }
}

function displayUsers(users) {
  const html = users.map(user => `
    <div class="user-card">
      <h3>${user.name}</h3>
      <p>ID: ${user.id}</p>
      <p>邮箱: ${user.email}</p>
      <p>角色: ${user.role}</p>
    </div>
  `).join('')
  document.getElementById('userList').innerHTML = html
}

async function createUser() {
  const name = document.getElementById('newUserName').value
  const email = document.getElementById('newUserEmail').value
  const role = document.getElementById('newUserRole').value

  if (!name || !email) {
    document.getElementById('createResult').textContent = 
      '请填写所有字段'
    return
  }

  try {
    const user = await window.ipcApi.invoke('createUser', { name, email, role })
    document.getElementById('createResult').textContent = 
      `用户创建成功: ${JSON.stringify(user, null, 2)}`
    
    // Clear inputs
    document.getElementById('newUserName').value = ''
    document.getElementById('newUserEmail').value = ''
    
    // Reload users
    loadUsers()
  } catch (error) {
    document.getElementById('createResult').textContent = 
      `错误: ${error.message}`
  }
}

// Make functions global
window.getPath = getPath
window.loadUsers = loadUsers
window.getUser = getUser
window.createUser = createUser

// Load users on startup
loadUsers()
