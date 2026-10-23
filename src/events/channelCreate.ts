import { Events, Channel, TextChannel } from 'discord.js';
import { getModConfig } from '../utils/database.js';
import { modLogEmbed } from '../utils/embeds.js';
import { EMOJIS } from '../utils/constants.js';

function isGuildTextChannel(channel: Channel): channel is TextChannel {
  return channel.type === 0 && channel.guild !== null; // ChannelType.GuildText = 0
}

export default {
  name: Events.ChannelCreate,
  once: false,
  async execute(channel: Channel): Promise<void> {
    if (!isGuildTextChannel(channel)) return;

    try {
      const modConfig = await getModConfig(channel.guild.id);
      if (!modConfig?.logChannelId) return;

      const logChannel = channel.guild.channels.cache.get(modConfig.logChannelId);
      if (!logChannel || !isGuildTextChannel(logChannel)) return;

      const embed = modLogEmbed('CHANNEL_CREATE', channel.guild.client.user!, channel.guild.members.me!.user, `Channel created: ${channel.name}`, undefined, undefined);
      embed.setTitle(`${EMOJIS.INFO} Channel Created`);
      embed.setDescription(`**Channel:** ${channel}\n**Type:** ${channel.type}`);
      
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error('ChannelCreate error:', error);
    }
  },
};