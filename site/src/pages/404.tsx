export default function NotFound() {
  return (
    <>
      <Head>
        <title>404 - adjskit</title>
        <link rel="stylesheet" href="/docs-styles.css" />
        <link rel="stylesheet" href="/home.css" />
      </Head>

      <div class="home-shell">
        <main class="home-main home-404">
          <h1>404</h1>
          <p>That page does not exist.</p>
          <a class="btn-primary" href="/">
            Back home
          </a>
        </main>

        <footer class="site-footer">
          <span>&copy; 2026 adjskit. All rights reserved.</span>
          <a href="https://github.com/devs-des1re/adjskit/blob/main/LICENSE">
            Released under the MIT License
          </a>
        </footer>
      </div>
    </>
  );
}
