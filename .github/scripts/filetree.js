const fs = require('fs-extra');
const path = require('path');

// 配置项 - 根据你的实际目录结构调整
const config = {
  // 仓库根目录（NJUST-docs的绝对路径）
  // 从脚本路径(.github/scripts/filetree.js)向上跳转两级即可到达NJUST-docs
  rootDir: path.resolve(__dirname, '../../'),
  
  // JSON输出路径（仓库根目录下的_filetree目录）
  outputPath: path.resolve(__dirname, '../../_filetree/filetree.json'),
  
  // GitHub仓库信息（替换为你的实际信息）
  github: {
    username: 'NJUST-OpenLib',
    repo: 'NJUST-docs',       // 仓库名称
    branch: 'main'            // 分支名称
  },
  
  // 需要忽略的目录/文件（根据实际情况调整）
  ignore: [
    'node_modules', 
    '.git', 
    '.github', 
    'scripts', 
    '_filetree', 
    'dist', 
    '.vuepress'
  ]
};

/**
 * 递归扫描目录并生成文件树结构
 * @param {string} currentDir 当前扫描的目录路径
 * @returns {object} 包含目录信息的对象
 */
function scanDir(currentDir) {
  // 计算当前目录相对于仓库根目录的路径
  const relativePath = path.relative(config.rootDir, currentDir);
  
  // 构建目录信息对象
  const dirInfo = {
    name: path.basename(currentDir),
    path: relativePath,
    type: 'directory',
    children: []
  };

  try {
    // 读取目录下的所有文件/子目录
    const files = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const file of files) {
      // 跳过需要忽略的文件/目录
      if (config.ignore.includes(file.name)) continue;

      const fullPath = path.join(currentDir, file.name);
      const fileRelativePath = path.relative(config.rootDir, fullPath);
      
      // 将Windows路径分隔符(\)转换为URL需要的/(GitHub链接要求)
      const githubPath = fileRelativePath.replace(/\\/g, '/');

      if (file.isDirectory()) {
        // 递归处理子目录
        dirInfo.children.push(scanDir(fullPath));
      } else {
        // 处理文件，生成GitHub链接
        const ext = path.extname(file.name).toLowerCase();
        
        // 构建GitHub网页预览链接和原始文件下载链接
        const webUrl = `https://github.com/${config.github.username}/${config.github.repo}/blob/${config.github.branch}/${githubPath}`;
        const downloadUrl = `https://raw.githubusercontent.com/${config.github.username}/${config.github.repo}/${config.github.branch}/${githubPath}`;

        dirInfo.children.push({
          name: file.name,
          path: fileRelativePath,
          type: 'file',
          ext: ext,
          webUrl: webUrl,
          downloadUrl: downloadUrl
        });
      }
    }
  } catch (err) {
    console.error(`扫描目录出错 ${currentDir}:`, err.message);
  }

  return dirInfo;
}

/**
 * 主函数：生成文件树并写入JSON文件
 */
async function generateFileTree() {
  try {
    // 验证根目录是否存在
    if (!await fs.pathExists(config.rootDir)) {
      throw new Error(`仓库根目录不存在: ${config.rootDir}`);
    }

    console.log(`开始扫描仓库目录: ${config.rootDir}`);
    
    // 生成文件树
    const fileTree = scanDir(config.rootDir);
    
    // 确保输出目录存在
    await fs.ensureDir(path.dirname(config.outputPath));
    
    // 写入JSON文件
    await fs.writeJson(config.outputPath, fileTree, { spaces: 2, encoding: 'utf-8' });
    
    console.log(`文件树JSON已成功生成: ${config.outputPath}`);
  } catch (err) {
    console.error('生成文件树失败:', err.message);
    process.exit(1); // 出错时退出并返回错误码
  }
}

// 执行主函数
generateFileTree();
