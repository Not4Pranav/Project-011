import { Events, GuildMember } from 'discord.js';
import { getWelcomeConfig } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberRemove,
  once: false,
  async execute(member: GuildMember): Promise<void> {
    try {
      const welcomeConfig = await getWelcomeConfig(member.guild.id);
      if (!welcomeConfig?.enabled || !welcomeConfig.leaveChannelId) return;

      const channel = member.guild.channels.cache.get(welcomeConfig.leaveChannelId);
      if (!channel?.isTextBased()) return;

      const leaveMessage = welcomeConfig.messages.find((m: any) => m.type === 'LEAVE');
      if (!leaveMessage) return;

      const { welcomeEmbedCustom } = await import('../utils/embeds.js');
      const embed = welcomeEmbedCustom(member, leaveMessage.content, leaveMessage.embedData as Record<string, any> | undefined);
      
      await channel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      logger.error('GuildMemberRemove error:', error);
    }
  },
};