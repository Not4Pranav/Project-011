import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const timeoutCommand: Command = {
  data: {
    name: 'timeout',
    description: 'Timeout a user (Discord native timeout)',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to timeout', type: 6, required: true },
      { name: 'duration', description: 'Duration in minutes (max 40320 = 28 days)', type: 4, required: true, min_value: 1, max_value: 40320 },
      { name: 'reason', description: 'Reason for timeout', type: 3, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason', true);
    const moderator = interaction.user;
    const guild = interaction.guild!;

    if (user.id === moderator.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot timeout yourself.')], ephemeral: true });
      return;
    }

    if (user.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot timeout a bot.')], ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('User not found in this server.')], ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot timeout this user (higher role or missing permissions).')], ephemeral: true });
      return;
    }

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      await member.timeout(duration * 60 * 1000, reason);
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.TIMEOUT,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
        duration,
      });

      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Duration:** ${duration} minutes\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.MUTE} User Timed Out`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.dmOnAction) {
        try {
          const dmEmbed = modEmbed(`You have been timed out in **${guild.name}**\n**Duration:** ${duration} minutes\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
          dmEmbed.setTitle(`${EMOJIS.MUTE} Timeout Received`);
          await user.send({ embeds: [dmEmbed] });
        } catch {
          // Ignore DM failures
        }
      }

      if (modConfig.logChannelId) {
        const logChannel = guild.channels.cache.get(modConfig.logChannelId);
        if (logChannel?.isTextBased()) {
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      logger.error('Timeout command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to timeout user.')], ephemeral: true });
    }
  },
};

export default timeoutCommand;