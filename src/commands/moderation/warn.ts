import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember, PermissionFlagsBits } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createWarning, createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const warnCommand: Command = {
  data: {
    name: 'warn',
    description: 'Warn a user',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to warn', type: 6, required: true },
      { name: 'reason', description: 'Reason for warning', type: 3, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const moderator = interaction.user;
    const guild = interaction.guild!;

    if (user.id === moderator.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot warn yourself.')], ephemeral: true });
      return;
    }

    if (user.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot warn a bot.')], ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member && !member.moderatable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot warn this user (higher role or missing permissions).')], ephemeral: true });
      return;
    }

    try {
      const guildConfig = await getGuildConfig(guild.id);
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      await createWarning(modConfig.id, user.id, moderator.id, reason);
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.WARN,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
      });

      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.WARN} User Warned`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.dmOnAction) {
        try {
          const dmEmbed = modEmbed(`You have been warned in **${guild.name}**\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
          dmEmbed.setTitle(`${EMOJIS.WARN} Warning Received`);
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

      await checkWarningThreshold(guild, user, modConfig, client);
    } catch (error) {
      logger.error('Warn command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to warn user.')], ephemeral: true });
    }
  },
};

async function checkWarningThreshold(guild: any, user: User, modConfig: any, client: BotClient): Promise<void> {
  const { getWarnings } = await import('../../utils/database.js');
  const warnings = await getWarnings(modConfig.id, user.id);
  
  if (warnings.length >= 3) {
    const thresholdEmbed = modEmbed(`${user.tag} has reached ${warnings.length} warnings! Consider further action.`);
    thresholdEmbed.setTitle(`${EMOJIS.WARNING} Warning Threshold Reached`);
    
    if (modConfig.logChannelId) {
      const logChannel = guild.channels.cache.get(modConfig.logChannelId);
      if (logChannel?.isTextBased()) {
        await logChannel.send({ embeds: [thresholdEmbed] });
      }
    }
  }
}

export default warnCommand;