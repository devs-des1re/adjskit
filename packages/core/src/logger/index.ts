import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
import pc from 'picocolors';
import type { LogLevel } from '../types.js';

/** Numeric priority so a minimum level gates lower-severity messages. */
const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  success: 25,
  warn: 30,
  error: 40,
};

const LEVEL_COLOR: Record<LogLevel, (s: string) => string> = {
  debug: pc.gray,
  info: pc.cyan,
  success: pc.green,
  warn: pc.yellow,
  error: pc.red,
};

/** UTC timestamp formatted `YYYY-MM-DD HH:MM:SS`. */
function now(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function serializeExtra(args: unknown[]): string {
  if (args.length === 0) return '';
  const parts = args.map((arg) => {
    if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
    if (typeof arg === 'string') return arg;
    return safeStringify(arg);
  });
  return ` ${parts.join(' ')}`;
}

export interface LoggerOptions {
  /** Minimum level to emit. Default `info`. */
  level?: LogLevel;
  /** Directory for per-run log files. Default `logs`. Set `file: false` to skip. */
  logDir?: string;
  /** Write colored output to the console. Default `true`. */
  console?: boolean;
  /** Persist every line to a per-run file under {@link LoggerOptions.logDir}. Default `true`. */
  file?: boolean;
}

export class Logger {
  readonly level: LogLevel;
  readonly logDir: string | null;
  private readonly useConsole: boolean;
  private readonly useFile: boolean;
  private readonly fileStamp: string;
  private logFilePath: string | null = null;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.useConsole = options.console ?? true;
    this.useFile = options.file ?? true;
    this.logDir = this.useFile ? (options.logDir ?? 'logs') : null;
    this.fileStamp = now().replace(/[:]/g, '-').replace(' ', '_');
  }

  /** Lazily resolves (and creates) the per-run log file path. */
  getLogFilePath(): string | null {
    if (!this.logDir) return null;
    if (!this.logFilePath) {
      mkdirSync(this.logDir, { recursive: true });
      this.logFilePath = join(this.logDir, `${this.fileStamp}.log`);
    }
    return this.logFilePath;
  }

  private write(level: LogLevel, message: string, extra: unknown[]): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[this.level]) return;
    const time = now();
    const extraStr = serializeExtra(extra);
    const line = `[${level}] [${time}]: ${message}${extraStr}`;

    if (this.useConsole) {
      const tag = LEVEL_COLOR[level](`[${level}]`);
      const out = `${tag} [${time}]: ${message}${extraStr}`;
      if (level === 'error') {
        process.stderr.write(`${out}\n`);
      } else {
        process.stdout.write(`${out}\n`);
      }
    }

    if (this.useFile) {
      const filePath = this.getLogFilePath();
      if (filePath) appendFileSync(filePath, `${line}\n`);
    }
  }

  success(message: string, ...extra: unknown[]): void {
    this.write('success', message, extra);
  }
  info(message: string, ...extra: unknown[]): void {
    this.write('info', message, extra);
  }
  warn(message: string, ...extra: unknown[]): void {
    this.write('warn', message, extra);
  }
  error(message: string, ...extra: unknown[]): void {
    this.write('error', message, extra);
  }
  debug(message: string, ...extra: unknown[]): void {
    this.write('debug', message, extra);
  }
}

/** Creates a configured {@link Logger} instance. */
export function createLogger(options: LoggerOptions = {}): Logger {
  return new Logger(options);
}

/** Default singleton logger. Bot entrypoints should construct their own from config. */
export const logger = createLogger();
