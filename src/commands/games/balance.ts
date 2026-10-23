import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed, paginatedEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser, addBalance, getLeaderboard } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, COLORS, LIMITS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const balanceCommand: Command = {
  data: {
    name: 'balance',
    description: 'Check your or another user\'s balance',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to check balance for', type: 6, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const user = await getOrCreateGameUser(gameConfig.id, targetUser.id);
      
      const embed = gameEmbed(
        `**User:** ${targetUser.tag}\n` +
        `**Balance:** ${user.balance.toLocaleString()} ${EMOJIS.COINS}\n` +
        `**XP:** ${user.xp.toLocaleString()} ${EMOJIS.XP}\n` +
        `**Level:** ${user.level} ${EMOJIS.LEVEL}\n` +
        `**Daily Streak:** ${user.streak} ${EMOJIS.DAILY}`
      ).setTitle(`${EMOJIS.COINS} Balance`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Balance command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch balance.')], ephemeral: true });
    }
  },
};

export default balanceCommand;