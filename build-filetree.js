const fs = require('fs');
const path = require('path');
const { readdir, stat, writeFile } = require('fs/promises');

// ================= 配置 =================
const ROOT = __dirname;
const IGNORE_DIRS = new Set(['_附件', 'node_modules', '.git', '.vuepress', 'docs', 'data']);
const IGNORE_FILES = new Set(['filetree.json', '.DS_Store']);

// ================= 工具函数 =================

function toUnixPath(p) {
    return p.split(path.sep).join('/');
}

function getRepoRelativePath(fullPath) {
    const rel = path.relative(ROOT, fullPath);
    return toUnixPath(rel);
}

// ================= 判断是否是课程 =================
function isCourseFolder(dir, entries) {
    const hasReadme = entries.some(e => e.isFile() && e.name.toLowerCase() === 'readme.md');
    const folderName = path.basename(dir);
    return hasReadme && folderName !== '_附件';
}

// ================= 递归生成文件树 =================
async function scanDirectory(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    const tree = [];

    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name) || IGNORE_FILES.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);
        const repoRelPath = getRepoRelativePath(fullPath);

        if (entry.isDirectory()) {
            const children = await scanDirectory(fullPath);
            if (children.length > 0) {
                tree.push({
                    name: entry.name,
                    type: 'directory',
                    path: repoRelPath,
                    children: children,
                });
            }
        } else {
            tree.push({
                name: entry.name,
                type: 'file',
                path: repoRelPath,
                ext: path.extname(entry.name),
            });
        }
    }
    return tree.sort((a, b) => (b.type === 'directory') - (a.type === 'directory'));
}

// ================= 递归扫描所有课程 =================
async function scanAll(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });

    // 1. 检查当前文件夹是否是课程
    if (isCourseFolder(currentDir, entries)) {
        const tree = await scanDirectory(currentDir);
        const outputPath = path.join(currentDir, 'filetree.json');
        await writeFile(outputPath, JSON.stringify(tree, null, 2), 'utf8');
        console.log('✅ 已生成:', getRepoRelativePath(currentDir));
    }

    // 2. 递归子文件夹
    for (const entry of entries) {
        if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
            await scanAll(path.join(currentDir, entry.name));
        }
    }
}

// ================= 启动 =================
console.log('🚀 正在构建 GitHub 下载路径兼容的文件树...');
scanAll(ROOT).then(() => {
    console.log('\n✨ 所有 filetree.json 生成完毕！');
});