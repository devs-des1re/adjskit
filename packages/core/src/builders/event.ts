import type { ClientEvents } from 'discord.js';
import type { EventDescriptor } from '../descriptors.js';

export interface EventBuilder<K extends keyof ClientEvents> {
  /** Marks the listener to fire only once (uses `client.once`). */
  setOnce(): EventBuilder<K>;
  setExecute(fn: (...args: ClientEvents[K]) => Promise<void>): EventBuilder<K>;
  build(): EventDescriptor<K>;
}

interface EventBuilderState<K extends keyof ClientEvents> {
  name: K;
  once: boolean;
  execute?: EventDescriptor<K>['execute'];
}

function makeEventBuilder<K extends keyof ClientEvents>(
  state: EventBuilderState<K>,
): EventBuilder<K> {
  return {
    setOnce() {
      return makeEventBuilder<K>({ ...state, once: true });
    },
    setExecute(fn: (...args: ClientEvents[K]) => Promise<void>): EventBuilder<K> {
      return makeEventBuilder<K>({ ...state, execute: fn });
    },
    build(): EventDescriptor<K> {
      return {
        name: state.name,
        once: state.once,
        execute: state.execute,
      };
    },
  };
}

/**
 * Declares a Discord event listener. The generic `K` ties the execute fn's
 * arguments to the typed `ClientEvents` payload for that event.
 *
 * @example
 * export default createEvent('guildMemberAdd')
 *   .setExecute(async (member) => {
 *     await member.guild.systemChannel?.send(`Welcome ${member}!`);
 *   });
 *
 * @example
 * export default createEvent('ready')
 *   .setOnce()
 *   .setExecute(async (client) => {
 *     console.log(`Logged in as ${client.user.tag}`);
 *   });
 */
export function createEvent<K extends keyof ClientEvents>(name: K): EventBuilder<K> {
  return makeEventBuilder<K>({ name, once: false });
}
