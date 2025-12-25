const fs = require('fs');
const path = require('path');

const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');

try {
  let content = fs.readFileSync(changelogPath, 'utf8');
  
  // 移除 commit 链接: ([7d8s7f](...))
  // 匹配模式：空格 + ( + [ + 这里的字符不含] + ] + ( + 这里的字符不含) + ) + )
  const linkRegex = / \(\[[0-9a-f]+\]\([^)]+\)\)/g;
  
  // 也可以移除比较链接，通常在版本号标题处
  // ## [1.0.0](...) (2023-01-01) -> ## 1.0.0 (2023-01-01)
  // 但保留版本号比较链接通常是有用的。用户主要反感的是每一行的 commit 链接。
  // 如果用户也想移除标题链接，可以使用下面的正则：
  // const headerLinkRegex = /\[([0-9]+\.[0-9]+\.[0-9]+)\]\([^)]+\)/g;
  // content = content.replace(headerLinkRegex, '$1');

  // 仅移除行尾的 commit hash 链接
  const newContent = content.replace(linkRegex, '');
  
  if (content !== newContent) {
    fs.writeFileSync(changelogPath, newContent, 'utf8');
    console.log('✅ 已从 CHANGELOG.md 移除 commit 链接');
  } else {
    console.log('ℹ️ CHANGELOG.md 中未发现需要移除的链接');
  }
} catch (error) {
  console.error('❌ 处理 CHANGELOG.md 失败:', error);
  process.exit(1);
}
