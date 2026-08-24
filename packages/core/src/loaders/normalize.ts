/**
 * Loaders accept a file's default export in two forms:
 *  - a resolved descriptor (the builder's `.build()` result), or
 *  - a fluent builder object with a `.build()` method.
 *
 * This normalizes the latter into the former so users can write
 * `export default createCommand('ping').setExecute(...)` without calling
 * `.build()` themselves.
 */
export function normalizeDescriptor<T>(value: unknown): T | null {
  if (value === null || value === undefined) return null;
  const candidate = value as { build?: () => T };
  if (typeof candidate.build === 'function') {
    try {
      return candidate.build();
    } catch {
      return null;
    }
  }
  return value as T;
}
