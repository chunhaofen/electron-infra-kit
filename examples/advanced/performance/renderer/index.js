// 显示结果
function showResult(message) {
    const el = document.getElementById('testResult');
    el.textContent = message;
    el.style.display = 'block';
    
    setTimeout(() => {
        el.style.display = 'none';
    }, 5000);
}

// 运行耗时操作
async function runHeavyOperation() {
    const start = performance.now();
    
    try {
        const result = await window.ipcApi.invoke('perf:heavy-operation', {});
        const duration = (performance.now() - start).toFixed(2);
        
        showResult(`✅ 操作完成！耗时: ${duration}ms，结果: ${result.result}`);
        loadStats();
    } catch (error) {
        showResult(`❌ 操作失败: ${error.message}`);
    }
}

// 运行批量操作
async function runBatchOperation() {
    const count = parseInt(document.getElementById('batchCount').value);
    const start = performance.now();
    
    try {
        const result = await window.ipcApi.invoke('perf:batch-operation', { count });
        const duration = (performance.now() - start).toFixed(2);
        
        showResult(`✅ 批量操作完成！处理了 ${result.count} 项，耗时: ${duration}ms`);
        loadStats();
    } catch (error) {
        showResult(`❌ 操作失败: ${error.message}`);
    }
}

// 加载统计数据
async function loadStats() {
    try {
        const result = await window.ipcApi.invoke('perf:get-stats', {});
        const stats = result.stats;
        
        const container = document.getElementById('statsContainer');
        
        if (Object.keys(stats).length === 0) {
            container.innerHTML = '<p style="color:#999;margin-top:15px;">暂无性能数据</p>';
            return;
        }
        
        let html = '<table class="metrics-table"><thead><tr>';
        html += '<th>操作</th><th>次数</th><th>总耗时</th><th>平均</th><th>最小</th><th>最大</th>';
        html += '</tr></thead><tbody>';
        
        for (const [name, data] of Object.entries(stats)) {
            html += '<tr>';
            html += `<td>${name}</td>`;
            html += `<td>${data.count}</td>`;
            html += `<td>${data.total.toFixed(2)}ms</td>`;
            html += `<td>${data.avg.toFixed(2)}ms</td>`;
            html += `<td>${data.min.toFixed(2)}ms</td>`;
            html += `<td>${data.max.toFixed(2)}ms</td>`;
            html += '</tr>';
        }
        
        html += '</tbody></table>';
        container.innerHTML = html;
    } catch (error) {
        console.error('加载统计失败:', error);
    }
}

// 清除指标
async function clearMetrics() {
    try {
        await window.ipcApi.invoke('perf:clear-metrics', {});
        showResult('✅ 性能指标已清除');
        loadStats();
    } catch (error) {
        showResult(`❌ 清除失败: ${error.message}`);
    }
}

// 更新窗口尺寸显示
function updateWindowSize() {
    document.getElementById('windowWidth').textContent = window.innerWidth + 'px';
    document.getElementById('windowHeight').textContent = window.innerHeight + 'px';
}

// 监听窗口大小变化
window.addEventListener('resize', updateWindowSize);

// 页面加载时
window.addEventListener('DOMContentLoaded', () => {
    updateWindowSize();
    loadStats();
});

// Make global
window.runHeavyOperation = runHeavyOperation;
window.runBatchOperation = runBatchOperation;
window.loadStats = loadStats;
window.clearMetrics = clearMetrics;
