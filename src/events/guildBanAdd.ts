import { Events, GuildBan, TextChannel } from 'discord.js';
import { getModConfig } from '../utils/database.js';
import { modLogEmbed } from '../utils/embeds.js';
import { EMOJIS } from '../utils/constants.js';

export default {
  name: Events.GuildBanAdd,
  once: false,
  async execute(ban: GuildBan): Promise<void> {
    try {
      const modConfig = await getModConfig(ban.guild.id);
      if (!modConfig?.logChannelId) return;

      const channel = ban.guild.channels.cache.get(modConfig.logChannelId);
      if (!channel?.isTextBased()) return;

      const embed = modLogEmbed('BAN', ban.guild.client.user!, ban.user, 'Banned by moderator', undefined, undefined);
      embed.setTitle(`${EMOJIS.BAN} Member Banned`);
      
      await (channel as TextChannel).send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error('GuildBanAdd error:', error);
    }
  },
};