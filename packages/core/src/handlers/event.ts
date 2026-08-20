import type { AdjskClient } from '../client.js';
import { logger } from '../logger/index.js';

/**
 * Wires every loaded event descriptor onto the client as a listener. Non-once
 * descriptors use `client.on`; once descriptors use `client.once` (so they fire
 * exactly one time). Each listener awaits the descriptor's execute fn and logs
 * any rejection rather than crashing the process.
 */
export function registerEventHandlers(client: AdjskClient): void {
  for (const [name, descriptors] of client.events) {
    for (const desc of descriptors) {
      const execute = desc.execute as ((...args: unknown[]) => Promise<void>) | undefined;
      const listener = async (...args: unknown[]): Promise<void> => {
        try {
          await execute?.(...args);
        } catch (err) {
          logger.error(`Error executing event "${name}".`, err);
        }
      };
      if (desc.once) {
        client.once(name, listener);
      } else {
        client.on(name, listener);
      }
    }
  }
}
