export default function Home() {
  return (
    <>
      <Head>
        <title>adjskit - discord.js framework</title>
        <meta
          name="description"
          content="A discord.js v14 framework with unified slash + prefix commands, signed components, and database presets."
        />
        <link rel="stylesheet" href="/docs-styles.css" />
        <link rel="stylesheet" href="/home.css" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      <div class="home-shell">
        <header class="docs-navbar">
          <a class="navbar-title" href="/">adjskit</a>
          <div class="navbar-actions">
            <a class="social-link" href="https://github.com/devs-des1re/adjskit">
              <Icon name="tabler:brand-github" width="20" height="20" />
            </a>
            <a class="btn-primary" href="/docs/">
              Read the docs
            </a>
          </div>
        </header>

        <main class="home-main">
          <section class="home-hero">
            <p class="hero-eyebrow">discord.js v14 - TypeScript-first</p>
            <h1 class="hero-title">adjskit</h1>
            <p class="hero-sub">
              One file per command that works as a slash command, a prefix
              command, or both. Signed component ids, typed events, cooldowns,
              and database presets - your project keeps only the handlers,
              everything else lives in the library.
            </p>
            <div class="hero-actions">
              <a class="btn-primary" href="/docs/">
                Get started
              </a>
              <a class="btn-secondary" href="https://www.npmjs.com/package/@adjskit/core">
                npm
              </a>
              <a class="btn-secondary" href="https://github.com/devs-des1re/adjskit">
                GitHub
              </a>
            </div>
          </section>

          <section class="home-quickstart">
            <p class="quickstart-label">Quick start</p>
            <pre class="quickstart-pre"><code>npx adjskit create my-bot</code></pre>
            <pre class="quickstart-pre"><code>cd my-bot</code></pre>
            <pre class="quickstart-pre"><code>npm run dev</code></pre>
          </section>
        </main>

        <footer class="home-footer">MIT licensed. Built with Krate.</footer>
      </div>
    </>
  );
}
