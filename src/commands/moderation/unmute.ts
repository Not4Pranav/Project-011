import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getActiveMute, deactivateMute, createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

async function handleAutoUnmute(guild: any, userId: string, modConfig: any, client: BotClient): Promise<void> {
  try {
    const activeMute = await getActiveMute(modConfig.id, userId);
    if (!activeMute) return;

    await deactivateMute(activeMute.id);
    const modCase = await createModCase(modConfig.id, {
      type: CASE_TYPES.UNMUTE,
      userId,
      moderatorId: client.user!.id,
      reason: 'Automatic unmute - duration expired',
    });

    if (modConfig.logChannelId) {
      const logChannel = guild.channels.cache.get(modConfig.logChannelId);
      if (logChannel?.isTextBased()) {
        const embed = modEmbed(`**User:** <@${userId}> (${userId})\n**Reason:** Automatic unmute - duration expired\n**Case ID:** ${modCase.id}`);
        embed.setTitle(`${EMOJIS.UNMUTE} Auto Unmute`);
        await logChannel.send({ embeds: [embed] });
      }
    }
  } catch (error) {
    logger.error('Auto-unmute error:', error);
  }
}

const unmuteCommand: Command = {
  data: {
    name: 'unmute',
    description: 'Unmute a user',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to unmute', type: 6, required: true },
      { name: 'reason', description: 'Reason for unmute', type: 3, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const moderator = interaction.user;
    const guild = interaction.guild!;

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      const activeMute = await getActiveMute(modConfig.id, user.id);
      
      if (!activeMute) {
        await interaction.reply({ embeds: [errorEmbed('User is not currently muted.')], ephemeral: true });
        return;
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      let unmuted = false;

      if (member) {
        try {
          if (member.isCommunicationDisabled()) {
            await member.timeout(null, reason);
            unmuted = true;
          }
        } catch (error) {
          logger.warn('Failed to remove Discord timeout:', error);
        }

        if (modConfig.muteRoleId && !unmuted) {
          const muteRole = guild.roles.cache.get(modConfig.muteRoleId);
          if (muteRole && member.roles.cache.has(muteRole.id)) {
            try {
              await member.roles.remove(muteRole, reason);
              unmuted = true;
            } catch (error) {
              logger.error('Failed to remove mute role:', error);
            }
          }
        }
      }

      await deactivateMute(activeMute.id);
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.UNMUTE,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
      });

      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.UNMUTE} User Unmuted`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.dmOnAction) {
        try {
          const dmEmbed = modEmbed(`You have been unmuted in **${guild.name}**\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
          dmEmbed.setTitle(`${EMOJIS.UNMUTE} Unmute Received`);
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
      logger.error('Unmute command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to unmute user.')], ephemeral: true });
    }
  },
};

export { unmuteCommand as default, handleAutoUnmute };