import { Events, ActivityType } from 'discord.js';
import { BotClient } from '../structures/ExtendedClient.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: BotClient): Promise<void> {
    logger.info(`Bot ready! Logged in as ${client.user?.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);

    client.user?.setPresence({
      activities: [{ name: '/setup to configure', type: ActivityType.Playing }],
      status: 'online',
    });

    logger.info('Presence set');
  },
};