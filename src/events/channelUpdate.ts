import { Events, Channel, TextChannel } from 'discord.js';
import { getModConfig } from '../utils/database.js';
import { modLogEmbed } from '../utils/embeds.js';
import { EMOJIS } from '../utils/constants.js';

function isGuildTextChannel(channel: Channel): channel is TextChannel {
  return channel.type === 0 && channel.guild !== null;
}

export default {
  name: Events.ChannelUpdate,
  once: false,
  async execute(oldChannel: Channel, newChannel: Channel): Promise<void> {
    if (!isGuildTextChannel(newChannel)) return;

    try {
      const modConfig = await getModConfig(newChannel.guild.id);
      if (!modConfig?.logChannelId) return;

      const logChannel = newChannel.guild.channels.cache.get(modConfig.logChannelId);
      if (!logChannel || !isGuildTextChannel(logChannel)) return;

      const changes: string[] = [];
      if (isGuildTextChannel(oldChannel) && oldChannel.name !== newChannel.name) changes.push(`Name: ${oldChannel.name} → ${newChannel.name}`);
      if (oldChannel.type !== newChannel.type) changes.push(`Type: ${oldChannel.type} → ${newChannel.type}`);
      if (isGuildTextChannel(oldChannel) && isGuildTextChannel(newChannel) && oldChannel.topic !== newChannel.topic) {
        changes.push(`Topic: ${oldChannel.topic ?? 'None'} → ${newChannel.topic ?? 'None'}`);
      }

      if (changes.length === 0) return;

      const embed = modLogEmbed('CHANNEL_UPDATE', newChannel.guild.client.user!, newChannel.guild.members.me!.user, `Channel updated: ${newChannel.name}`, undefined, undefined);
      embed.setTitle(`${EMOJIS.INFO} Channel Updated`);
      embed.setDescription(changes.join('\n'));
      
      await logChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (error) {
      console.error('ChannelUpdate error:', error);
    }
  },
};