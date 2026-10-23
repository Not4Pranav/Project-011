import { config, validateConfig } from './config/index.js';
import { client } from './structures/ExtendedClient.js';
import { loadCommands } from './commands/index.js';
import { loadEvents } from './events/index.js';
import { prisma } from './database/client.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  try {
    validateConfig();
    logger.info('Configuration validated');

    await prisma.$connect();
    logger.info('Connected to database');

    await loadCommands(client);
    await loadEvents(client);

    await client.start();
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main();

export { client };