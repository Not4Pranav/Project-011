import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getWarnings, getModConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const warningsCommand: Command = {
  data: {
    name: 'warnings',
    description: 'View warnings for a user',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to check warnings for', type: 6, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.options.getUser('user', true);
    const guild = interaction.guild!;

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      const warnings = await getWarnings(modConfig.id, user.id);
      
      if (warnings.length === 0) {
        await interaction.reply({ embeds: [successEmbed(`${user.tag} has no warnings.`)] });
        return;
      }

      const embed = modEmbed(`**User:** ${user.tag} (${user.id})\n**Total Warnings:** ${warnings.length}`)
        .setTitle(`${EMOJIS.WARN} Warnings for ${user.tag}`);

      for (let i = 0; i < Math.min(warnings.length, 10); i++) {
        const w = warnings[i];
        const moderator = await client.users.fetch(w.moderatorId).catch(() => ({ tag: 'Unknown' }));
        embed.addFields({
          name: `#${warnings.length - i} - <t:${Math.floor(w.createdAt.getTime() / 1000)}:R>`,
          value: `**Moderator:** ${moderator.tag}\n**Reason:** ${w.reason}`,
          inline: false,
        });
      }

      if (warnings.length > 10) {
        embed.setFooter({ text: `Showing 10 of ${warnings.length} warnings` });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Warnings command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch warnings.')], ephemeral: true });
    }
  },
};

export default warningsCommand;