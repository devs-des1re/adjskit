import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docsRoot = join(root, 'content', 'docs');
const distDocs = join(root, 'dist', 'docs');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.mdx?$/.test(entry)) out.push(full);
  }
  return out;
}

function htmlPathFor(sourcePath) {
  const parts = relative(docsRoot, sourcePath).replace(/\.mdx?$/, '').split(/[\\/]/);
  if (parts[parts.length - 1] === 'index') parts.pop();
  return join(distDocs, ...parts, 'index.html');
}

function extractFences(markdown) {
  const fences = [];
  const re = /^```([A-Za-z0-9_-]*)[^\n]*\n([\s\S]*?)\n```[ \t]*$/gm;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    fences.push({ lang: match[1], code: match[2] });
  }
  return fences;
}

const PRE_RE = /<pre><code(?: class=(?:")?language-([\w-]+)(?:")?)?>([\s\S]*?)<\/code><\/pre>/g;

function encodeEntities(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;');
}

let fixedBlocks = 0;
let reviewed = [];

for (const file of walk(docsRoot)) {
  const htmlFile = htmlPathFor(file);
  if (!existsSync(htmlFile)) {
    reviewed.push(`${relative(root, file)} -> missing ${relative(root, htmlFile)}`);
    continue;
  }

  const markdown = readFileSync(file, 'utf8');
  const fences = extractFences(markdown);
  if (fences.length === 0) continue;

  let html = readFileSync(htmlFile, 'utf8');
  const blocks = [...html.matchAll(PRE_RE)];
  if (blocks.length !== fences.length) {
    reviewed.push(`${relative(root, file)} (${blocks.length} HTML <pre> vs ${fences.length} markdown fences)`);
    continue;
  }

  let result = '';
  let cursor = 0;
  let pageFixed = 0;

  blocks.forEach((block, i) => {
    result += html.slice(cursor, block.index);
    result += `<pre><code${fences[i].lang ? ` class="language-${fences[i].lang}"` : ''}>${encodeEntities(fences[i].code)}</code></pre>`;
    cursor = block.index + block[0].length;
    pageFixed++;
  });
  result += html.slice(cursor);

  writeFileSync(htmlFile, result);
  fixedBlocks += pageFixed;
}

console.log(`fix-code-blocks: restored newlines in ${fixedBlocks} code block(s)`);
if (reviewed.length > 0) {
  console.warn('fix-code-blocks: pages needing review:');
  for (const item of reviewed) console.warn(`  - ${item}`);
}
