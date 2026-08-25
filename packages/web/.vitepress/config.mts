import { defineConfig } from 'vitepress';

const base = process.env.DOCS_BASE_PATH ?? '/';

export default defineConfig({
  lang: 'en-US',
  title: 'adjskit',
  description:
    'A discord.js v14 framework with unified slash + prefix commands, signed components, typed events, cooldowns, and database presets.',

  base: '/',
  srcDir: 'content',
  outDir: 'dist',
  cleanUrls: true,
  sitemap: { hostname: 'https://adjskit.js.org' },

  themeConfig: {
    siteTitle: 'adjskit',

    nav: [
      { text: 'Docs', link: '/docs/', activeMatch: '/docs/' },
      { text: 'Getting started', link: '/docs/guides/getting-started' },
      { text: 'CLI', link: '/docs/cli', activeMatch: '/docs/cli' },
    ],

    sidebar: {
      '/docs/': [
        { text: 'Introduction', link: '/docs/' },
        { text: 'CLI Reference', link: '/docs/cli' },
        {
          text: 'Guides',
          collapsed: false,
          items: [
            { text: 'Getting started', link: '/docs/guides/getting-started' },
            { text: 'Commands', link: '/docs/guides/commands' },
            { text: 'Components', link: '/docs/guides/components' },
            { text: 'Events', link: '/docs/guides/events' },
            { text: 'Config & errors', link: '/docs/guides/config' },
            { text: 'Databases', link: '/docs/guides/database' },
            { text: 'Project anatomy', link: '/docs/guides/project-anatomy' },
            { text: 'Deploying', link: '/docs/guides/deployment' },
          ],
        },
        {
          text: 'Handbook',
          collapsed: false,
          items: [
            { text: 'Signed custom ids', link: '/docs/handbook/signed-custom-ids' },
            { text: 'Cooldowns', link: '/docs/handbook/cooldowns' },
            { text: 'FAQ', link: '/docs/handbook/faq' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/devs-des1re/adjskit' }],

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
        },
      },
    },

    outline: { level: [2, 3], label: 'On this page' },

    footer: {
      message: 'Released under the <a href="https://github.com/devs-des1re/adjskit/blob/main/LICENSE">MIT License</a>',
      copyright: '© 2026 adjskit. All rights reserved.',
    },
  },
});
