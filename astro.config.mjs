// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
// import fixBaseLinks from './src/integrations/fixBaseLinks.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://everwynn.github.io/', // 学习站独立域名
  // 仓库名
  base: '/cs-lab/',
  trailingSlash: 'always', // 处理GitHub Pages子路径路由404

  integrations: [
    vue(),
    tailwind(),
    mdx(),
    // fixBaseLinks('/cs-lab/') // 传入base路径
  ],

  output: 'static',

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
