import { Client, Collection, type ClientOptions, type GatewayIntentsString } from 'discord.js';
import type {
  ButtonDescriptor,
  CommandDescriptor,
  DropdownDescriptor,
  EventDescriptor,
  ModalDescriptor,
} from './descriptors.js';
import type { AppConfig } from './config/index.js';

/**
 * adjskit's discord.js client. Adds typed collections that loaders (Phase 2+)
 * populate and handlers consume. All collections start empty.
 */
export class AdjskClient extends Client {
  slashCommands = new Collection<string, CommandDescriptor>();
  prefixCommands = new Collection<string, CommandDescriptor>();
  buttons = new Collection<string, ButtonDescriptor>();
  modals = new Collection<string, ModalDescriptor>();
  dropdowns = new Collection<string, DropdownDescriptor>();
  events = new Collection<string, EventDescriptor[]>();
}

/**
 * Derives gateway intents from config. When a prefix is configured (prefix
 * commands may exist), `GuildMessages` + the privileged `MessageContent`
 * intent are included; otherwise a minimal `Guilds`-only set is used.
 */
export function resolveIntents(config: AppConfig): GatewayIntentsString[] {
  const intents: GatewayIntentsString[] = ['Guilds'];
  if (config.prefix) {
    intents.push('GuildMessages', 'MessageContent');
  }
  return intents;
}

export interface CreateBotOptions {
  config: AppConfig;
  /** Override the derived intents (otherwise resolved from config). */
  intents?: GatewayIntentsString[];
  /** Additional discord.js client options merged on top of the defaults. */
  clientOptions?: Partial<ClientOptions>;
}

/**
 * Constructs an {@link AdjskClient} with sensible default intents derived
 * from config. Loaders, handlers, and login are wired up in later phases.
 */
export function createBot(options: CreateBotOptions): AdjskClient {
  const intents = options.intents ?? resolveIntents(options.config);
  const client = new AdjskClient({ ...options.clientOptions, intents });
  return client;
}
