import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed } from '../../utils/embeds.js';
import { getModCases, getModConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, CASE_TYPES } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const caseCommand: Command = {
  data: {
    name: 'case',
    description: 'View moderation case details',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      { name: 'case_id', description: 'Case ID to view', type: 3, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const caseId = interaction.options.getString('case_id', true);
    const guild = interaction.guild!;

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured. Run /setup first.')], ephemeral: true });
        return;
      }

      const cases = await getModCases(modConfig.id);
      const modCase = cases.find(c => c.id.startsWith(caseId.slice(0, 8)));

      if (!modCase) {
        await interaction.reply({ embeds: [errorEmbed('Case not found.')], ephemeral: true });
        return;
      }

      const targetUser = await client.users.fetch(modCase.userId).catch(() => ({ tag: 'Unknown', id: modCase.userId }));
      const moderator = await client.users.fetch(modCase.moderatorId).catch(() => ({ tag: 'Unknown', id: 'Unknown' }));

      const typeEmojis: Record<string, string> = {
        [CASE_TYPES.WARN]: EMOJIS.WARN,
        [CASE_TYPES.MUTE]: EMOJIS.MUTE,
        [CASE_TYPES.UNMUTE]: EMOJIS.UNMUTE,
        [CASE_TYPES.KICK]: EMOJIS.KICK,
        [CASE_TYPES.BAN]: EMOJIS.BAN,
        [CASE_TYPES.UNBAN]: EMOJIS.UNBAN,
        [CASE_TYPES.TIMEOUT]: EMOJIS.MUTE,
        [CASE_TYPES.PURGE]: EMOJIS.PURGE,
      };

      const embed = modEmbed(
        `**Case ID:** ${modCase.id}\n` +
        `**Type:** ${typeEmojis[modCase.type] || ''} ${modCase.type}\n` +
        `**User:** ${targetUser.tag} (${targetUser.id})\n` +
        `**Moderator:** ${moderator.tag} (${moderator.id})\n` +
        `**Reason:** ${modCase.reason}\n` +
        `**Date:** <t:${Math.floor(modCase.createdAt.getTime() / 1000)}:F>`
      ).setTitle(`${typeEmojis[modCase.type] || EMOJIS.MOD} Case Details`);

      if (modCase.duration) {
        embed.addFields({ name: 'Duration', value: `${modCase.duration} minutes`, inline: true });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Case command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch case.')], ephemeral: true });
    }
  },
};

export default caseCommand;