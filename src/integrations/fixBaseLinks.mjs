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

                // // 递归读取全部html
                // function scanHtml(folder) {
                //     const entries = fs.readdirSync(folder, { withFileTypes: true });
                //     for (const entry of entries) {
                //         const fullPath = path.join(folder, entry.name);
                //         if (entry.isDirectory()) {
                //             scanHtml(fullPath);
                //         } else if (entry.name.endsWith('.html')) {
                //             let html = fs.readFileSync(fullPath, 'utf8');
                //             // 只替换以 / 开头、不是http:// https:// # 的链接
                //             html = html.replaceAll(/(href|src)="(\/(?!\/|http|#)[^"]+)"/g, `$1="${base}$2"`);
                //             fs.writeFileSync(fullPath, html, 'utf8');
                //         }
                //     }
                // }

                // scanHtml(distDir);
                // console.log(`✅已完成：全部HTML链接自动追加base路径 ${basePath}`);

                // 匹配 href / src 以 / 开头，排除 http https # //
                const regHtml = /(href|src)="(\/(?!\/|http|#)[^"]+)"/g;
                // JS文件内部字符串："/_astro/xxx"
                const regJsAsset = /"(\/_astro\/[^"]+)"/g;

                function scanAll(folder) {
                    const entries = fs.readdirSync(folder, { withFileTypes: true });
                    for (const entry of entries) {
                        const fullPath = path.join(folder, entry.name);
                        if (entry.isDirectory()) {
                            scanAll(fullPath);
                        } else if (entry.name.endsWith('.html')) {
                            let content = fs.readFileSync(fullPath, 'utf8');
                            content = content.replaceAll(regHtml, `$1="${base}$2"`);
                            fs.writeFileSync(fullPath, content, 'utf8');
                        } else if (entry.name.endsWith('.js')) {
                            let content = fs.readFileSync(fullPath, 'utf8');
                            // 替换js源码字符串内的 /_astro/xxx
                            content = content.replaceAll(regJsAsset, `"${base}$1"`);
                            fs.writeFileSync(fullPath, content, 'utf8');
                        }
                    }
                }

                scanAll(distDir);
                console.log(`✅已完成：HTML + JS资源链接追加base路径 ${basePath}`);

            }
        }
    };
}
