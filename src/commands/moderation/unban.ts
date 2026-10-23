import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createModCase, getModConfig, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const unbanCommand: Command = {
  data: {
    name: 'unban',
    description: 'Unban a user from the server',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
    cooldown: 5000,
    options: [
      { name: 'user_id', description: 'User ID to unban', type: 3, required: true },
      { name: 'reason', description: 'Reason for unban', type: 3, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const moderator = interaction.user;
    const guild = interaction.guild!;

    if (!/^\d{17,19}$/.test(userId)) {
      await interaction.reply({ embeds: [errorEmbed('Invalid user ID.')], ephemeral: true });
      return;
    }

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      const ban = await guild.bans.fetch(userId).catch(() => null);
      if (!ban) {
        await interaction.reply({ embeds: [errorEmbed('User is not banned.')], ephemeral: true });
        return;
      }

      await guild.bans.remove(userId, reason);
      const modCase = await createModCase(modConfig.id, {
        type: CASE_TYPES.UNBAN,
        userId,
        moderatorId: moderator.id,
        reason,
      });

      const user = ban.user;
      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
      embed.setTitle(`${EMOJIS.UNBAN} User Unbanned`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.logChannelId) {
        const logChannel = guild.channels.cache.get(modConfig.logChannelId);
        if (logChannel?.isTextBased()) {
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      logger.error('Unban command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to unban user.')], ephemeral: true });
    }
  },
};

export default unbanCommand;