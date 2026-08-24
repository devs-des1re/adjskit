import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Krate emits absolute asset/content URLs ("/docs/...", "/index.<hash>.js").
 * GitHub Pages project sites are served under a subpath (e.g. /adjskit/), so
 * every emitted URL must be prefixed. Set BASE_PATH=/adjskit before building
 * in CI; leave it unset for local builds (script is then a no-op).
 */

const basePath = (process.env.BASE_PATH ?? '').replace(/\/+$/, '');
if (!basePath) {
  console.log('BASE_PATH not set — skipping URL prefixing.');
  process.exit(0);
}
if (!basePath.startsWith('/')) {
  console.error(`BASE_PATH must start with "/": got "${basePath}"`);
  process.exit(1);
}

const distDir = fileURLToPath(new URL('../dist', import.meta.url));

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let edits = 0;

for (const file of walk(distDir)) {
  if (!/\.(html|css|js|mjs|json)$/.test(file)) continue;
  let content = readFileSync(file, 'utf8');
  const before = content;

  // HTML attributes: href="/x", src="/x" — krate's minifier strips quotes,
  // so handle both quoted and unquoted forms (not protocol-relative "//").
  content = content.replace(/\b(href|src)="\/(?!\/)/g, `$1="${basePath}/`);
  content = content.replace(/\b(href|src)=\/(?!\/)/g, `$1=${basePath}/`);

  // CSS url(...) references
  content = content.replace(/url\(\s*(['"]?)\/(?!\/)/g, `url($1${basePath}/`);

  // Absolute string literals inside JS (search assets, data index)
  content = content.replaceAll('"/docs/search/"', `"${basePath}/docs/search/"`);
  content = content.replaceAll('"/docs/data/"', `"${basePath}/docs/data/"`);
  content = content.replaceAll(
    '"/docs/data/search-index.json"',
    `"${basePath}/docs/data/search-index.json"`,
  );

  if (content !== before) {
    writeFileSync(file, content);
    edits++;
  }
}

console.log(`Prefixed ${edits} file(s) with base path ${basePath}.`);
