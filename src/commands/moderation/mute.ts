import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember, PermissionFlagsBits } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createMute, createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';
import { handleAutoUnmute } from './unmute.js';

const muteCommand: Command = {
  data: {
    name: 'mute',
    description: 'Mute a user (timeout or role-based)',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to mute', type: 6, required: true },
      { name: 'duration', description: 'Duration in minutes (0 = permanent)', type: 4, required: false },
      { name: 'reason', description: 'Reason for mute', type: 3, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration') || 0;
    const reason = interaction.options.getString('reason', true);
    const moderator = interaction.user;
    const guild = interaction.guild!;

    if (user.id === moderator.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot mute yourself.')], ephemeral: true });
      return;
    }

    if (user.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot mute a bot.')], ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ embeds: [errorEmbed('User not found in this server.')], ephemeral: true });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot mute this user (higher role or missing permissions).')], ephemeral: true });
      return;
    }

    try {
      const guildConfig = await getGuildConfig(guild.id);
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      let muteApplied = false;
      let muteMethod = '';

      if (duration > 0 && duration <= 40320) {
        try {
          await member.timeout(duration * 60 * 1000, reason);
          muteApplied = true;
          muteMethod = `Discord timeout (${duration} minutes)`;
        } catch (error) {
          logger.warn('Failed to apply Discord timeout, falling back to role mute:', error);
        }
      }

      if (!muteApplied && modConfig.muteRoleId) {
        const muteRole = guild.roles.cache.get(modConfig.muteRoleId);
        if (muteRole) {
          try {
            await member.roles.add(muteRole, reason);
            muteApplied = true;
            muteMethod = duration > 0 ? `Role mute (${duration} minutes)` : 'Role mute (permanent)';
          } catch (error) {
            logger.error('Failed to apply mute role:', error);
          }
        }
      }

      if (!muteApplied) {
        await interaction.reply({ embeds: [errorEmbed('Failed to mute user. No mute role configured and timeout failed.')], ephemeral: true });
        return;
      }

      await createMute(modConfig.id, user.id, moderator.id, reason, duration > 0 ? duration : undefined);
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.MUTE,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
        duration: duration > 0 ? duration : undefined,
      });

      const durationText = duration > 0 ? `${duration} minutes` : 'Permanent';
      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Duration:** ${durationText}\n**Method:** ${muteMethod}\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.MUTE} User Muted`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.dmOnAction) {
        try {
          const dmEmbed = modEmbed(`You have been muted in **${guild.name}**\n**Duration:** ${durationText}\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
          dmEmbed.setTitle(`${EMOJIS.MUTE} Mute Received`);
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

      if (duration > 0) {
        setTimeout(async () => {
          try {
            await handleAutoUnmute(guild, user.id, modConfig, client);
          } catch (error) {
            logger.error('Auto-unmute failed:', error);
          }
        }, duration * 60 * 1000);
      }
    } catch (error) {
      logger.error('Mute command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to mute user.')], ephemeral: true });
    }
  },
};

export default muteCommand;