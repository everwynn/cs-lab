// @ts-check
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://everwynn.github.io/', // 学习站独立域名
  // 仓库名
  base: '/cs-lab/',

  integrations: [
    vue(),
    tailwind(),
    mdx(),
  ],

  output: 'static',

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
