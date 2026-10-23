import { Events, Message } from 'discord.js';
import { createSnipedMessage } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.MessageDelete,
  once: false,
  async execute(message: Message): Promise<void> {
    if (message.author.bot || !message.guild || message.partial) return;

    try {
      await createSnipedMessage({
        guildId: message.guild.id,
        channelId: message.channel.id,
        userId: message.author.id,
        content: message.content,
        attachments: message.attachments.map(a => a.url),
        embeds: message.embeds.length > 0 ? message.embeds.map(e => e.toJSON()) : undefined,
      });
    } catch (error) {
      logger.error('MessageDelete snipe error:', error);
    }
  },
};