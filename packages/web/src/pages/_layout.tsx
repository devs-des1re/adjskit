export default function SiteLayout({ children }: { children: unknown }) {
  return (
    <div class="site-shell">
      <Head>
        <link rel="stylesheet" href="/site.css" />
      </Head>

      <header class="site-navbar">
        <a class="site-navbar-brand" href="/">
          <span class="site-logo">a</span>
          <span class="site-navbar-name">adjskit</span>
        </a>
        <nav class="site-nav">
          <a href="/docs/">Docs</a>
          <a href="/docs/guides/getting-started/">Getting started</a>
          <a href="/docs/cli/">CLI</a>
          <a href="https://github.com/devs-des1re/adjskit" class="site-nav-github">
            GitHub
          </a>
        </nav>
      </header>

      <main>{children}</main>

      <footer class="site-footer">
        <div class="site-footer-inner">
          <span>&copy; 2026 adjskit. All rights reserved.</span>
          <a href="https://github.com/devs-des1re/adjskit/blob/main/LICENSE">
            Released under the MIT License
          </a>
        </div>
      </footer>
    </div>
  );
}
