import { defineConfig, docs } from '@krate/core';

export default defineConfig({
  entry: 'src/pages/index.tsx',
  outDir: 'dist',
  pagesDir: 'src/pages',
  publicDir: 'public',
  minify: true,
  sourcemap: false,

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
    baseUrl: 'https://adjskit.js.org',
    siteName: 'adjskit',
    description:
      'A discord.js v14 framework with unified slash + prefix commands, signed components, and database presets.',
  },

  plugins: [
    docs({
      contentDir: 'content/docs',
      title: 'adjskit',
      layout: 'src/components/docs-layout.tsx',
      search: {
        enabled: true,
        engine: 'docfind',
      },
      links: [
        {
          icon: 'lucide:github',
          url: 'https://github.com/devs-des1re/adjskit',
        },
      ],
    }),
  ],
});
