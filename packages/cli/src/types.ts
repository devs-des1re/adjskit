/** Languages supported by the scaffolded project. */
export type Lang = 'ts' | 'js';

/** Database presets selectable at scaffold time. */
export type DatabasePreset = 'none' | 'file' | 'sqlite' | 'postgres' | 'mysql' | 'mongo' | 'redis';

export const DATABASE_PRESETS: readonly DatabasePreset[] = [
  'none',
  'file',
  'sqlite',
  'postgres',
  'mysql',
  'mongo',
  'redis',
];

export interface CreateOptions {
  /** Project (and folder) name. */
  name: string;
  lang: Lang;
  db: DatabasePreset;
  /** Command prefix; `null` disables prefix commands (slash-only). */
  prefix: string | null;
  guildIds?: string[];
  token?: string;
  clientId?: string;
  /** Run `npm install` after scaffolding. */
  install: boolean;
  /** Initialize a git repository. */
  git: boolean;
  /** Output directory; defaults to `cwd/name`. Used by tests. */
  targetDir?: string;
}

export interface ScaffoldedFile {
  /** Path relative to the project root. */
  path: string;
  content: string;
}
