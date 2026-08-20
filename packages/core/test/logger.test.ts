import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLogger, Logger } from '../src/index.js';

const LINE_RE = /^\[(success|info|warn|error|debug)\] \[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\]: .*/;

describe('Logger', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), `adjskit-log-`));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes the [type] [time]: message format to a per-run file', () => {
    const log = new Logger({ level: 'debug', logDir: dir, console: false });
    log.info('hello world');
    const filePath = log.getLogFilePath();
    expect(filePath).not.toBeNull();
    expect(existsSync(filePath!)).toBe(true);
    const content = readFileSync(filePath!, 'utf8').trim();
    expect(LINE_RE.test(content)).toBe(true);
    expect(content.endsWith(': hello world')).toBe(true);
  });

  it('gates messages below the configured level', () => {
    const log = new Logger({ level: 'warn', logDir: dir, console: false });
    log.debug('skipped');
    log.info('skipped');
    log.warn('kept');
    const filePath = log.getLogFilePath()!;
    const lines = readFileSync(filePath, 'utf8').trim().split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('kept');
    expect(lines[0]).not.toContain('skipped');
  });

  it('serializes Error extra args into the line', () => {
    const log = new Logger({ level: 'error', logDir: dir, console: false });
    const err = new Error('kaboom');
    log.error('something failed', err);
    const content = readFileSync(log.getLogFilePath()!, 'utf8');
    expect(content).toContain('something failed');
    expect(content).toContain('Error: kaboom');
  });

  it('routes error output to stderr', () => {
    const writeSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      const log = new Logger({ level: 'error', logDir: dir, console: true, file: false });
      log.error('boom');
      expect(writeSpy).toHaveBeenCalled();
      expect(stdoutSpy).not.toHaveBeenCalled();
    } finally {
      writeSpy.mockRestore();
      stdoutSpy.mockRestore();
    }
  });

  it('skips file writes when file: false', () => {
    const log = new Logger({ level: 'debug', file: false, console: false });
    log.info('no file');
    expect(log.getLogFilePath()).toBeNull();
  });
});

describe('createLogger', () => {
  it('returns a Logger instance with default options', () => {
    const log = createLogger();
    expect(log).toBeInstanceOf(Logger);
    expect(log.level).toBe('info');
  });
});
