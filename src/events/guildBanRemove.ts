import { Events, GuildBan, TextChannel } from 'discord.js';
import { getModConfig } from '../utils/database.js';
import { modLogEmbed } from '../utils/embeds.js';
import { EMOJIS } from '../utils/constants.js';

export default {
  name: Events.GuildBanRemove,
  once: false,
  async execute(ban: GuildBan): Promise<void> {
    try {
      const modConfig = await getModConfig(ban.guild.id);
      if (!modConfig?.logChannelId) return;

      const channel = ban.guild.channels.cache.get(modConfig.logChannelId);
      if (!channel?.isTextBased()) return;

      const embed = modLogEmbed('UNBAN', ban.guild.client.user!, ban.user, 'Unbanned by moderator', undefined, undefined);
      embed.setTitle(`${EMOJIS.UNBAN} Member Unbanned`);
      
      await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error('GuildBanRemove error:', error);
    }
  },
};