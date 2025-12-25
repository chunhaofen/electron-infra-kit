const fs = require('fs');
const path = require('path');

// 获取版本号：优先从命令行参数获取，否则从 package.json 获取
let version = process.argv[2];
if (!version) {
  try {
    version = require('../package.json').version;
  } catch (e) {
    console.error('Error reading package.json:', e);
    process.exit(1);
  }
}

// 移除版本号可能带有的 'v' 前缀
version = version.replace(/^v/, '');

const changelogPath = path.resolve(__dirname, '../CHANGELOG.md');
const outputPath = path.resolve(__dirname, '../RELEASE_BODY.md');

try {
  const changelog = fs.readFileSync(changelogPath, 'utf8');

  // 匹配当前版本的标题行
  // 匹配模式：
  // 1. 以 #, ##, ### 开头
  // 2. 可能有空格
  // 3. 可能有 [version] 或 version
  // 4. 这一行包含版本号
  const escapedVersion = version.replace(/\./g, '\\.');
  // Regex解释:
  // ^#+ : 匹配行首的一个或多个 #
  // \s+ : 匹配空格
  // \[? : 匹配可选的 [
  // version : 匹配版本号
  // .*$ : 匹配行尾剩余部分
  const versionHeaderRegex = new RegExp(`^#+\\s+\\[?${escapedVersion}\\]?.*$`, 'm');
  
  const match = changelog.match(versionHeaderRegex);

  if (!match) {
    console.error(`Could not find version ${version} in CHANGELOG.md`);
    // 如果找不到，创建一个默认的 body，避免 CI 失败
    fs.writeFileSync(outputPath, `Release ${version}`);
    process.exit(0);
  }

  const startIndex = match.index + match[0].length;
  const remainingContent = changelog.slice(startIndex);
  
  // 查找下一个版本标题（以 # [数字 开头，或者 ## [数字，或者 ### [数字）
  // 简单的做法是查找下一个以 # 开头且后面跟着 [数字 或 数字 的行
  // 但为了简单，我们查找下一个同级或更高级的标题，或者直接查找下一个看起来像版本号的标题
  // 实际上 standard-version 生成的 changelog，不同版本的标题格式通常一致
  // 我们查找下一个 `^#+ [` 或者 `^#+ \d`
  const nextHeaderRegex = /^#+\s+(\[?\d|\w+)/m;
  const nextHeaderMatch = remainingContent.match(nextHeaderRegex);
  
  const endIndex = nextHeaderMatch ? nextHeaderMatch.index : remainingContent.length;
  
  let body = remainingContent.slice(0, endIndex).trim();

  // 构建 Release Note 头部
  const isPreRelease = version.includes('-beta') || version.includes('-alpha') || version.includes('-rc');
  const npmTag = isPreRelease ? (version.includes('beta') ? 'beta' : 'next') : 'latest';
  
  let header = '';
  
  if (isPreRelease) {
    header += `**Note:** This is a pre-release version (${npmTag}). Please file new issues for any bugs you find in it.\n\n`;
  }
  
  header += `This release is published to npm under the \`${npmTag}\` tag and can be installed via:\n\n`;
  header += "```bash\n";
  header += `npm install electron-infra-kit@${npmTag}\n`;
  header += "# or\n";
  header += `npm install electron-infra-kit@${version}\n`;
  header += "```\n\n";
  
  header += `# Release Notes for v${version}\n\n`;
  
  const fullContent = header + body;
  
  fs.writeFileSync(outputPath, fullContent);
  console.log(`✅ Generated RELEASE_BODY.md for v${version}`);

} catch (error) {
  console.error('❌ Error generating release notes:', error);
  process.exit(1);
}
