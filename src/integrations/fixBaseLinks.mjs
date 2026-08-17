import fs from 'fs';
import path from 'path';

/**
 * Astro4构建完成后，批量替换dist中html的根绝对链接，补base前缀
 * @param {string} basePath 例如 '/cs-lab/'
 */
export default function fixBaseLinks(basePath) {
    return {
        name: 'fix-base-links',
        hooks: {
            'astro:build:done': async ({ dir }) => {
                let distDir = dir.pathname;
                // Windows下 pathname 形如 /E:/...，需去掉开头 /
                if (process.platform === 'win32' && distDir.startsWith('/')) {
                    distDir = distDir.slice(1);
                }
                const base = basePath.replace(/\/$/, ''); // 处理后：/cs-lab

                // 递归读取全部html
                function scanHtml(folder) {
                    const entries = fs.readdirSync(folder, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(folder, entry.name);
                        if (entry.isDirectory()) {
                            scanHtml(fullPath);
                        } else if (entry.name.endsWith('.html')) {
                            let html = fs.readFileSync(fullPath, 'utf8');
                
                            // 动态构建正则：排除已含 base 前缀、_astro、assets、http、# 的链接
                            const linkRegex = new RegExp(
                                `(href)="(\\/(?!\\/|http|#|_astro\\/|assets\\/|${base}\\/)[^"]*)"`,
                                'g'
                            );
                            html = html.replaceAll(linkRegex, `$1="${base}$2"`);
                
                            // 修复可能存在的双重 base 前缀
                            const doubleBase = `${base}${base}`;
                            while (html.includes(doubleBase)) {
                                html = html.replaceAll(doubleBase, base);
                            }
                
                            fs.writeFileSync(fullPath, html, 'utf8');
                        } else if (entry.name.endsWith('.js')) {
                            let content = fs.readFileSync(fullPath, 'utf8');
                            // 只匹配后面直接跟 /_astro/，前面没有 base(/cs-lab) 的
                            content = content.replaceAll(
                                new RegExp(`"((?!${base})\\/_astro\\/[^"]+)"`, 'g'),
                                `"${base}$1"`
                            );
                            fs.writeFileSync(fullPath, content, 'utf8');
                        } else if (entry.name.endsWith('.css')) {
                            let cssText = fs.readFileSync(fullPath, 'utf8');
                            const doubleBase = `${base}${base}`;
                            while(cssText.includes(doubleBase)){
                                cssText = cssText.replaceAll(doubleBase, base);
                            }
                            fs.writeFileSync(fullPath, cssText, 'utf8');
                        }
                    }
                }

                scanHtml(distDir);
                console.log(`✅已完成：全部HTML链接自动追加base路径 ${basePath}`);
            }
        }
    };
}
