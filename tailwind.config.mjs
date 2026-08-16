import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  // 保留动态拼接的渐变色类（亮色 + 暗色），防止被 Tailwind 静态扫描时 tree-shake 掉
  safelist: [
    // 亮模式渐变（DemoExplorer.vue categoryGradientsLight）
    'from-red-400', 'to-orange-500',
    'from-blue-400', 'to-cyan-500',
    'from-purple-400', 'to-indigo-500',
    'from-amber-400', 'to-yellow-500',
    'from-emerald-400', 'to-teal-500',
    // 暗模式渐变（DemoExplorer.vue categoryGradientsDark）
    'from-red-900', 'to-orange-950',
    'from-blue-900', 'to-cyan-950',
    'from-purple-900', 'to-indigo-950',
    'from-amber-900', 'to-yellow-950',
    'from-emerald-900', 'to-teal-950',
    // 兜底色
    'from-slate-400', 'to-slate-500',
    'from-slate-800', 'to-slate-900',
  ],
  theme: {
    extend: {
      colors: {
        // 深色科技风主色调
        accent: {
          DEFAULT: '#10b981', // 主强调色：青绿
          light: '#34d399',
          dark: '#059669',
        },
      },
      transitionProperty: {
        theme: 'background-color, border-color, color, fill, stroke, box-shadow',
      },
    },
  },
  plugins: [typography],
};
