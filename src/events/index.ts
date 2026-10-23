import { readdirSync } from 'fs';
import { join } from 'path';
import { BotClient } from '../structures/ExtendedClient.js';
import { Event } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function loadEvents(client: BotClient): Promise<void> {
  const eventsPath = join(process.cwd(), 'src', 'events');
  const eventFiles = readdirSync(eventsPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

  let count = 0;

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    try {
      const module = await import(filePath);
      
      if (module.default && isEvent(module.default)) {
        const event: Event = module.default;
        if (event.once) {
          client.once(event.name, (...args) => event.execute(...args, client));
        } else {
          client.on(event.name, (...args) => event.execute(...args, client));
        }
        count++;
      } else if (module.events) {
        for (const event of module.events) {
          if (isEvent(event)) {
            if (event.once) {
              client.once(event.name, (...args) => event.execute(...args, client));
            } else {
              client.on(event.name, (...args) => event.execute(...args, client));
            }
            count++;
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to load event ${file}:`, error);
    }
  }

  logger.info(`Loaded ${count} events`);
}

function isEvent(obj: any): obj is Event {
  return obj && typeof obj === 'object' && 'name' in obj && 'execute' in obj && typeof obj.execute === 'function';
}

export function unloadEvent(client: BotClient, name: string): void {
  client.removeAllListeners(name);
}

export async function reloadEvent(client: BotClient, filePath: string): Promise<void> {
  delete require.cache[require.resolve(filePath)];
  await loadEvents(client);
}