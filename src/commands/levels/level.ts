import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, AttachmentBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser, getLeaderboard } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const levelCommand: Command = {
  data: {
    name: 'level',
    description: 'Check your or another user\'s level',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to check level for', type: 6, required: false },
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
      
      // Calculate XP needed for next level
      const xpForCurrentLevel = (user.level - 1) * 1000;
      const xpForNextLevel = user.level * 1000;
      const currentXp = user.xp - xpForCurrentLevel;
      const neededXp = xpForNextLevel - xpForCurrentLevel;
      const progress = Math.min(100, Math.round((currentXp / neededXp) * 100));
      
      // Create progress bar
      const barLength = 20;
      const filled = Math.round((progress / 100) * barLength);
      const empty = barLength - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

      const embed = gameEmbed(
        `**User:** ${targetUser.tag}\n` +
        `**Level:** ${user.level} ${EMOJIS.LEVEL}\n` +
        `**XP:** ${user.xp.toLocaleString()} ${EMOJIS.XP}\n` +
        `**Progress:** ${currentXp.toLocaleString()} / ${neededXp.toLocaleString()} XP\n` +
        `\`${progressBar}\` ${progress}%\n` +
        `**Rank:** #${await getRank(gameConfig.id, targetUser.id)}`
      ).setTitle(`${EMOJIS.LEVEL} Level & Rank`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Level command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch level.')], ephemeral: true });
    }
  },
};

async function getRank(configId: string, userId: string): Promise<number> {
  const { getLeaderboard } = await import('../../utils/database.js');
  const leaders = await getLeaderboard(configId, 'XP', 1000);
  const index = leaders.findIndex(l => l.userId === userId);
  return index >= 0 ? index + 1 : 0;
}

export default levelCommand;