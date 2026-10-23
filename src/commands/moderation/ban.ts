import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const banCommand: Command = {
  data: {
    name: 'ban',
    description: 'Ban a user from the server',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to ban', type: 6, required: true },
      { name: 'reason', description: 'Reason for ban', type: 3, required: true },
      { name: 'delete_days', description: 'Days of messages to delete (0-7)', type: 4, required: false, min_value: 0, max_value: 7 },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);
    const deleteDays = interaction.options.getInteger('delete_days') || 0;
    const moderator = interaction.user;
    const guild = interaction.guild!;

    if (user.id === moderator.id) {
      await interaction.reply({ embeds: [errorEmbed('You cannot ban yourself.')], ephemeral: true });
      return;
    }

    if (user.bot) {
      await interaction.reply({ embeds: [errorEmbed('You cannot ban a bot.')], ephemeral: true });
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member && !member.bannable) {
      await interaction.reply({ embeds: [errorEmbed('I cannot ban this user (higher role or missing permissions).')], ephemeral: true });
      return;
    }

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      await guild.members.ban(user.id, { deleteMessageSeconds: deleteDays * 86400, reason });
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.BAN,
        userId: user.id,
        moderatorId: moderator.id,
        reason,
        duration: deleteDays * 1440,
      });

      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Reason:** ${reason}\n**Delete Messages:** ${deleteDays} days\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.BAN} User Banned`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.dmOnAction) {
        try {
          const dmEmbed = modEmbed(`You have been banned from **${guild.name}**\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
          dmEmbed.setTitle(`${EMOJIS.BAN} Ban Received`);
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
      logger.error('Ban command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to ban user.')], ephemeral: true });
    }
  },
};

export default banCommand;