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
                const distDir = dir.pathname;
                const base = basePath.replace(/\/$/, ''); // 处理后：/cs‑lab

                // 递归读取全部html
                function scanHtml(folder) {
                    const entries = fs.readdirSync(folder, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(folder, entry.name);
                        if (entry.isDirectory()) {
                            scanHtml(fullPath);
                        } else if (entry.name.endsWith('.html')) {
                            let html = fs.readFileSync(fullPath, 'utf8');
                            // 只替换以 / 开头、不是http:// https:// # 的链接
                            // html = html.replaceAll(/(href|src)="(\/(?!\/|http|#)[^"]+)"/g, `$1="${base}$2"`);

                            // HTML：只替换业务跳转链接，排除 _astro assets http # //
                            html = html.replaceAll(
                                /(href)="(\/(?!\/|http|#|_astro\/|assets\/)[^"]+)"/g,
                                `$1="${base}$2"`
                            );
                            fs.writeFileSync(fullPath, html, 'utf8');
                        } else if (entry.name.endsWith('.js')) {
                            console.log('entry.name: ' + entry.name);
                            let content = fs.readFileSync(fullPath, 'utf8');
                            // // 替换js源码字符串内的 /_astro/xxx
                            // content = content.replaceAll(/"(\/_astro\/[^"]+)"/g, `"${base}$1"`);
                            // 只匹配''后面直接跟 /_astro/，前面没有 base(/cs‑lab)
                            content = content.replaceAll(
                                new RegExp(`"((?!${base})\\/_astro\\/[^"]+)"`, 'g'),
                                `"${base}$1"`
                            );
                            console.log('content: ' + content);
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
