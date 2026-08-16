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
                const base = basePath.replace(/\/$/, '');

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
                            html = html.replaceAll(/(href|src)="(\/(?!\/|http|#)[^"]+)"/g, `$1="${base}$2"`);
                            fs.writeFileSync(fullPath, html, 'utf8');
                        }
                    }
                }
                scanHtml(distDir);
                console.log(`✅已完成：全部HTML链接自动追加base路径 ${basePath}`);
            }
        }
    };
}
