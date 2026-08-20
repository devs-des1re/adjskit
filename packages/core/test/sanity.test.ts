import { describe, it, expect } from 'vitest';
import { ADJSKIT_VERSION } from '../src/index.js';

describe('core sanity', () => {
  it('exports a version string', () => {
    expect(ADJSKIT_VERSION).toBe('0.0.0');
  });
});
