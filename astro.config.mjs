import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwind from '@astrojs/tailwind';

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: 'https://kyzz.space',

  integrations: [
    mdx(),
    tailwind({
      applyBaseStyles: false,
    }),
    sitemap(),
  ],

  markdown: {
    shikiConfig: {
      theme: 'dracula',
      wrap: true,
    },
  },

  output: "hybrid",
  adapter: cloudflare()
});