import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, errorEmbed } from '../../utils/embeds.js';
import { getSnipedMessage, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const snipeCommand: Command = {
  data: {
    name: 'snipe',
    description: 'Show the last deleted message in a channel',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'channel', description: 'Channel to snipe (default: current)', type: 7, required: false, channel_types: [0] },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const channel = (interaction.options.getChannel('channel') as any) || interaction.channel;
    const guild = interaction.guild!;

    try {
      const guildConfig = await getGuildConfig(guild.id);
      
      if (!guildConfig) {
        await interaction.reply({ embeds: [errorEmbed('Server not configured.')], ephemeral: true });
        return;
      }

      const sniped = await getSnipedMessage(guild.id, channel.id);
      
      if (!sniped) {
        await interaction.reply({ embeds: [errorEmbed('No recently deleted messages found in this channel.')], ephemeral: true });
        return;
      }

      const user = await client.users.fetch(sniped.userId).catch(() => ({ tag: 'Unknown User', displayAvatarURL: () => '' }));
      
      const embed = utilityEmbed(
        `**Author:** ${user.tag}\n` +
        `**Channel:** ${channel}\n` +
        `**Deleted:** <t:${Math.floor(sniped.deletedAt.getTime() / 1000)}:R>\n\n` +
        `**Content:**\n${sniped.content || '*No text content*'}`
      ).setTitle(`${EMOJIS.SNIPE} Sniped Message`)
        .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
        .setColor(COLORS.INFO);

      if (sniped.attachments && Array.isArray(sniped.attachments) && sniped.attachments.length > 0) {
        embed.setImage(sniped.attachments[0]);
        if (sniped.attachments.length > 1) {
          embed.addFields({ name: 'Attachments', value: sniped.attachments.slice(1).join('\n'), inline: false });
        }
      }

      if (sniped.embeds && Array.isArray(sniped.embeds) && sniped.embeds.length > 0) {
        embed.addFields({ name: 'Embeds', value: `${sniped.embeds.length} embed(s) in original message`, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Snipe command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch sniped message.')], ephemeral: true });
    }
  },
};

export default snipeCommand;