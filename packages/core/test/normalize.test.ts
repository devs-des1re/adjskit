import { describe, it, expect } from 'vitest';
import { normalizeDescriptor } from '../src/index.js';

describe('normalizeDescriptor', () => {
  it('passes through a plain descriptor unchanged', () => {
    const desc = { name: 'ping' };
    expect(normalizeDescriptor(desc)).toBe(desc);
  });

  it('calls build() on a builder object', () => {
    const built = { name: 'ping' };
    const builder = { build: () => built };
    expect(normalizeDescriptor(builder)).toBe(built);
  });

  it('returns null for null and undefined', () => {
    expect(normalizeDescriptor(null)).toBeNull();
    expect(normalizeDescriptor(undefined)).toBeNull();
  });

  it('returns null when build() throws', () => {
    expect(
      normalizeDescriptor({
        build: () => {
          throw new Error('x');
        },
      }),
    ).toBeNull();
  });
});
