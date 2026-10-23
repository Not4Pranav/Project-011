import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const kickCommand: Command = {
  data: {
    name: 'kick',
    description: 'Kick a user from the server',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to kick', type: 6, required: true },
      { name: 'reason', description: 'Reason for kick', type: 3, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const moderator = interaction.user;
    const guild = interaction.guild!;

    if (user.id === moderator.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot kick yourself.')], ephemeral: true });
      return;
    }

    if (user.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot kick a bot.')], ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('User not found in this server.')], ephemeral: true });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot kick this user (higher role or missing permissions).')], ephemeral: true });
      return;
    }

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      await member.kick(reason);
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.KICK,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
      });

      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.KICK} User Kicked`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.dmOnAction) {
        try {
          const dmEmbed = modEmbed(`You have been kicked from **${guild.name}**\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
          dmEmbed.setTitle(`${EMOJIS.KICK} Kick Received`);
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
      logger.error('Kick command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to kick user.')], ephemeral: true });
    }
  },
};

export default kickCommand;