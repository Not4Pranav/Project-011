import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getModCases, getModConfig, createAppeal, getAppeals, updateAppeal } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, CASE_TYPES } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const appealCommand: Command = {
  data: {
    name: 'appeal',
    description: 'Appeal a moderation case',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 30000,
    options: [
      { name: 'case_id', description: 'Case ID to appeal', type: 3, required: true },
      { name: 'reason', description: 'Reason for appeal', type: 3, required: true },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const caseId = interaction.options.getString('case_id', true);
    const reason = interaction.options.getString('reason', true);
    const user = interaction.user;
    const guild = interaction.guild!;

    try {
      const modConfig = await getModConfig(guild.id);
      
      if (!modConfig) {
        await interaction.reply({ embeds: [errorEmbed('Moderation not configured.')], ephemeral: true });
        return;
      }

      const cases = await getModCases(modConfig.id);
      const modCase = cases.find(c => c.id.startsWith(caseId.slice(0, 8)));

      if (!modCase) {
        await interaction.reply({ embeds: [errorEmbed('Case not found.')], ephemeral: true });
        return;
      }

      // Check if user is the one who was punished
      if (modCase.userId !== user.id) {
        await interaction.reply({ embeds: [errorEmbed('You can only appeal cases that involve you.')], ephemeral: true });
        return;
      }

      // Check if already appealed
      const existingAppeals = await getAppeals(modConfig.id, user.id, caseId);
      if (existingAppeals.length > 0) {
        await interaction.reply({ embeds: [errorEmbed('You have already appealed this case.')], ephemeral: true });
        return;
      }

      const appeal = await createAppeal({
        configId: modConfig.id,
        caseId: modCase.id,
        userId: user.id,
        reason,
      });

      const targetUser = await client.users.fetch(modCase.userId).catch(() => ({ tag: 'Unknown' }));
      const moderator = await client.users.fetch(modCase.moderatorId).catch(() => ({ tag: 'Unknown' }));

      const embed = modEmbed(
        `**Case ID:** ${modCase.id}\n` +
        `**Appealed by:** ${user.tag} (${user.id})\n` +
        `**Punished User:** ${targetUser.tag}\n` +
        `**Original Moderator:** ${moderator.tag}\n` +
        `**Original Reason:** ${modCase.reason}\n` +
        `**Appeal Reason:** ${reason}\n` +
        `**Status:** Pending Review\n` +
        `**Appeal ID:** ${appeal.id}`
      ).setTitle(`${EMOJIS.APPEAL} Appeal Submitted`);

      await interaction.reply({ embeds: [embed] });

      if (modConfig.logChannelId) {
        const logChannel = guild.channels.cache.get(modConfig.logChannelId);
        if (logChannel?.isTextBased()) {
          await logChannel.send({ embeds: [embed] });
        }
      }
    } catch (error) {
      logger.error('Appeal command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to submit appeal.')], ephemeral: true });
    }
  },
};

export default appealCommand;