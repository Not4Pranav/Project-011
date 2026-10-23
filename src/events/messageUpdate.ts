import { Events, Message } from 'discord.js';
import { createSnipedMessage } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.MessageUpdate,
  once: false,
  async execute(oldMessage: Message, newMessage: Message): Promise<void> {
    if (oldMessage.author.bot || !oldMessage.guild || oldMessage.partial || newMessage.partial) return;
    if (oldMessage.content === newMessage.content) return;

    try {
      await createSnipedMessage({
        guildId: oldMessage.guild.id,
        channelId: oldMessage.channel.id,
        userId: oldMessage.author.id,
        content: `**Edited:**\n**Before:** ${oldMessage.content}\n**After:** ${newMessage.content}`,
        attachments: newMessage.attachments.map(a => a.url),
        embeds: newMessage.embeds.length > 0 ? newMessage.embeds.map(e => e.toJSON()) : undefined,
      });
    } catch (error) {
      logger.error('MessageUpdate snipe error:', error);
    }
  },
};