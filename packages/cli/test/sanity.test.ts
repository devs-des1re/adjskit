import { describe, it, expect } from 'vitest';
import { ADJSKIT_CLI_VERSION } from '../src/version.js';

describe('cli sanity', () => {
  it('exports a version string', () => {
    expect(ADJSKIT_CLI_VERSION).toBe('0.0.0');
  });
});
