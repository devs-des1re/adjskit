export default function Home() {
  return (
    <>
      <Head>
        <title>adjskit — discord.js framework</title>
        <meta
          name="description"
          content="A discord.js v14 framework with unified slash + prefix commands, signed components, typed events, cooldowns, and database presets. Your project keeps only the handlers."
        />
      </Head>

      <section class="hero">
        <div class="hero-badge">discord.js v14 · TypeScript-first · CLI-driven</div>
        <h1 class="hero-title">One handler. Every command style.</h1>
        <p class="hero-subtitle">
          adjskit compiles your intent into a working bot: write one file per command
          and it answers as a slash command, a prefix command, or both — with typed
          arguments, signed interactive components, cooldowns, and database presets
          wired for you.
        </p>
        <div class="hero-actions">
          <a class="btn btn-primary" href="/docs/">Read the docs</a>
          <a class="btn btn-secondary" href="/docs/guides/getting-started/">
            Getting started
          </a>
        </div>
        <pre class="hero-code"><code>{`npx adjskit create my-bot
cd my-bot
npm run dev`}</code></pre>
      </section>

      <section class="features">
        <a class="feature-card" href="/docs/guides/commands/">
          <h3>Unified commands</h3>
          <p>Write once, run as slash, prefix, or both — with typed arguments parsed identically from either source.</p>
        </a>
        <a class="feature-card" href="/docs/handbook/signed-custom-ids/">
          <h3>Signed components</h3>
          <p>Buttons, dropdowns, and Components v2 modals carry params through compact HMAC-signed custom ids.</p>
        </a>
        <a class="feature-card" href="/docs/guides/events/">
          <h3>Typed events</h3>
          <p>Event names are keyof ClientEvents, so listener arguments are fully typed. Once-only listeners in one call.</p>
        </a>
        <a class="feature-card" href="/docs/handbook/cooldowns/">
          <h3>Cooldowns built in</h3>
          <p>Per-command cooldowns over memory, file, sqlite, postgres, mysql, mongo, or redis — with live timestamps.</p>
        </a>
        <a class="feature-card" href="/docs/guides/config/">
          <h3>Your words everywhere</h3>
          <p>Every guard, parse, and error message is overridable via defineConfig with variable placeholders.</p>
        </a>
        <a class="feature-card" href="/docs/guides/database/">
          <h3>Database presets</h3>
          <p>Pick none, file, sqlite, postgres, mysql, mongo, or redis at scaffold time — schema and queries generated.</p>
        </a>
      </section>

      <section class="cta-band">
        <h2>Scaffold a bot in seconds.</h2>
        <p>The CLI walks you through language, prefix, and storage.</p>
        <pre><code>{`npx adjskit create my-bot --lang ts --db sqlite
npx adjskit add command moderation/ban
npx adjskit sync`}</code></pre>
        <a class="btn btn-primary" href="/docs/cli/">CLI reference</a>
      </section>
    </>
  );
}
