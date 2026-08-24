import { defineConfig, docs, sitemap } from '@krate/core';

export default defineConfig({
  entry: 'src/pages/index.tsx',
  outDir: 'dist',
  pagesDir: 'src/pages',
  publicDir: 'public',
  minify: false,

  devServer: {
    port: 3000,
    open: false,
  },

  markdown: {
    gfm: true,
    headingAnchors: true,
    admonitions: true,
    codeHighlight: true,
  },

  seo: {
    baseUrl: 'https://adjskit.pages.dev',
    siteName: 'adjskit',
    description:
      'A discord.js v14 framework with unified slash + prefix commands, signed components, and database presets.',
  },

  plugins: [
    sitemap({ baseUrl: 'https://adjskit.pages.dev', changeFreq: 'weekly', priority: '0.8' }),
    docs({
      contentDir: 'content/docs',
      title: 'adjskit',
      layout: 'src/components/docs-layout.tsx',
      search: {
        enabled: true,
        engine: 'docfind',
        maxResults: 8,
      },
      links: [{ icon: 'lucide:github', url: 'https://github.com/devs-des1re/adjskit' }],
    }),
  ],
});
