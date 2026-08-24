import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ADJSKIT_VERSION } from '../src/index.js';

describe('core sanity', () => {
  it('exports a version string matching package.json', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      version: string;
    };
    expect(ADJSKIT_VERSION).toBe(pkg.version);
  });
});
