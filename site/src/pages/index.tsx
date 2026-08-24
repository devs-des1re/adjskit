interface IconSvgProps {
    name: string;
    size: number;
}

function IconSvg({ name, size }: IconSvgProps) {
    if (name === 'terminal') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M4 17l6-5-6-5" />
                <path d="M12 19h8" />
            </svg>
        );
    }

    if (name === 'lock') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
        );
    }

    if (name === 'zap') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M13 2L3 14h7l-1 8 11-13h-8l1-7z" />
            </svg>
        );
    }

    if (name === 'clock') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
            </svg>
        );
    }

    if (name === 'message') {
        return (
            <svg
                width={size}
                height={size}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
            >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
        );
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <ellipse cx="12" cy="5" rx="8" ry="3" />
            <path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
            <path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" />
        </svg>
    );
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
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                            </svg>
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
