interface IconSvgProps {
    name: string;
    size: number;
}

function IconSvg({ name, size }: IconSvgProps) {
    if (name === 'terminal') {
        return <Icon name="lucide:terminal" width={size} height={size} />;
    }

    if (name === 'lock') {
        return <Icon name="lucide:lock" width={size} height={size} />;
    }

    if (name === 'zap') {
        return <Icon name="lucide:zap" width={size} height={size} />;
    }

    if (name === 'clock') {
        return <Icon name="lucide:clock" width={size} height={size} />;
    }

    if (name === 'message') {
        return <Icon name="lucide:message-square" width={size} height={size} />;
    }

    return <Icon name="lucide:database" width={size} height={size} />;
}

interface FeatureCardProps {
    href: string;
    icon: string;
    title: string;
    description: string;
}

function FeatureCard(props: FeatureCardProps) {
    return (
        <a class="feature-card" href={props.href}>
            <span class="feature-icon">
                <IconSvg name={props.icon} size={20} />
            </span>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
        </a>
    );
}

export default function Home() {
    return (
        <>
            <Head>
                <title>adjskit - discord.js framework</title>
                <meta
                    name="description"
                    content="A discord.js v14 framework with unified slash + prefix commands, signed components, typed events, and database presets."
                />
                <link rel="stylesheet" href="/docs-styles.css" />
                <link rel="stylesheet" href="/home.css" />
              </Head>

            <div class="home-shell">
                <header class="docs-navbar">
                    <a class="navbar-title" href="/">adjskit</a>
                    <div class="navbar-actions">
                        <a
                            class="social-link"
                            href="https://github.com/devs-des1re/adjskit"
                            aria-label="GitHub repository"
                        >
                            <Icon name="lucide:github" width={20} height={20} />
                        </a>
                        <a class="btn-primary" href="/docs/">Read the docs</a>
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
                            <a class="btn-primary" href="/docs/">Get started</a>
                            <a
                                class="btn-secondary"
                                href="https://www.npmjs.com/package/@adjskit/core"
                            >
                                npm
                            </a>
                            <a
                                class="btn-secondary"
                                href="https://github.com/devs-des1re/adjskit"
                            >
                                GitHub
                            </a>
                        </div>
                    </section>

                    <section class="home-quickstart">
                        <p class="quickstart-label">Quick start</p>
                        <pre class="quickstart-pre"><code><span class="prompt">$ </span>npx adjskit create my-bot</code></pre>
                        <pre class="quickstart-pre"><code><span class="prompt">$ </span>cd my-bot</code></pre>
                        <pre class="quickstart-pre"><code><span class="prompt">$ </span>npm run dev</code></pre>
                    </section>

                    <section class="features-section">
                        <h2 class="features-heading">Everything wired for you</h2>
                        <p class="features-sub">
                            Six building blocks, zero boilerplate.
                        </p>
                        <div class="features-grid">
                            <FeatureCard
                                href="/docs/guides/commands/"
                                icon="terminal"
                                title="Unified commands"
                                description="Write one handler that runs as a slash command, a prefix command, or both - with typed arguments parsed identically from either source."
                            />
                            <FeatureCard
                                href="/docs/guides/components/"
                                icon="lock"
                                title="Signed components"
                                description="Buttons, dropdowns, and Components v2 modals carry params through compact HMAC-signed custom ids with expiry and user scoping."
                            />
                            <FeatureCard
                                href="/docs/guides/events/"
                                icon="zap"
                                title="Typed events"
                                description="Event names are keyof ClientEvents, so listener arguments are fully typed. Register once-only listeners with a single chain call."
                            />
                            <FeatureCard
                                href="/docs/handbook/cooldowns/"
                                icon="clock"
                                title="Cooldowns built in"
                                description="Per-command cooldowns backed by memory, file, sqlite, postgres, mysql, mongo, or redis - replies render live relative timestamps."
                            />
                            <FeatureCard
                                href="/docs/guides/config/"
                                icon="message"
                                title="Your words everywhere"
                                description="Every guard, parse, and error message is overridable through defineConfig with {variable} placeholders - the bot speaks your tone."
                            />
                            <FeatureCard
                                href="/docs/guides/database/"
                                icon="database"
                                title="Database presets"
                                description="Pick none, file, sqlite, postgres, mysql, mongo, or redis at scaffold time - schema, queries, and migrations generated automatically."
                            />
                        </div>
                    </section>
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
