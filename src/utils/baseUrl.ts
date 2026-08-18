/**
 * 获取站点 base 路径（如 '/cs-lab/'）
 *
 * - Astro 组件中：直接用 import.meta.env.BASE_URL
 * - Vue 组件中：导入此函数，自动从 <base> 标签或 meta 标签读取
 *
 * 只需在 astro.config.mjs 的 base 字段配置一次，全局生效。
 */

// 构建时注入的值（Astro 会在 SSR 时设置）
const astroBase = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';

/** 获取带尾部斜杠的 base 路径，如 '/cs-lab/' */
export function getBase(): string {
  // 客户端运行时：从 Astro 注入的 <meta> 或 <base> 标签读取
  if (typeof document !== 'undefined') {
    const meta = document.querySelector('meta[name="astro-base"]');
    if (meta) return meta.getAttribute('content') || '/';
  }
  return astroBase;
}

/** 拼接 base 路径：传入 '/about' → '/cs-lab/about' */
export function withBase(path: string): string {
  const base = getBase().replace(/\/$/, ''); // 去掉尾部斜杠
  return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
}
