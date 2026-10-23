import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const dailyCommand: Command = {
  data: {
    name: 'daily',
    description: 'Claim your daily reward',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.DAILY_COOLDOWN,
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.user;
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const gameUser = await getOrCreateGameUser(gameConfig.id, user.id);
      const now = new Date();
      let newStreak = 1;
      
      if (gameUser.lastDaily) {
        const lastDaily = new Date(gameUser.lastDaily);
        const diffHours = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 24) {
          const hoursLeft = Math.ceil(24 - diffHours);
          await interaction.reply({ 
            embeds: [errorEmbed(`You already claimed your daily reward. Come back in ${hoursLeft} hour(s).`)], 
            ephemeral: true 
          });
          return;
        }
        
        // Check streak (within 48 hours to maintain streak)
        const streakDiffHours = (now.getTime() - lastDaily.getTime()) / (1000 * 60 * 60);
        if (streakDiffHours <= 48) {
          newStreak = gameUser.streak + 1;
        } else {
          newStreak = 1;
        }
      }

      const { config } = await import('../../config/index.js');
      const baseReward = config.economy.dailyReward;
      const streakBonus = Math.min(newStreak * config.economy.dailyStreakBonus, 5000);
      const totalReward = baseReward + streakBonus;

      await updateGameUser(gameConfig.id, user.id, {
        balance: { increment: totalReward },
        xp: { increment: 50 },
        streak: newStreak,
        lastDaily: now,
      });

      // Level up check
      const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);
      const xpForNextLevel = updatedUser.level * 1000;
      let levelUpMessage = '';
      
      if (updatedUser.xp >= xpForNextLevel) {
        const newLevel = Math.floor(updatedUser.xp / 1000) + 1;
        await updateGameUser(gameConfig.id, user.id, { level: newLevel });
        levelUpMessage = `\n🎉 **Level Up!** You are now level **${newLevel}**!`;
      }

      const embed = successEmbed(
        `**Reward:** ${totalReward.toLocaleString()} ${EMOJIS.COINS}\n` +
        `**Streak:** ${newStreak} days ${EMOJIS.DAILY}${levelUpMessage}\n` +
        `**XP Gained:** 50 ${EMOJIS.XP}`
      ).setTitle(`${EMOJIS.DAILY} Daily Reward Claimed!`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Daily command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to claim daily reward.')], ephemeral: true });
    }
  },
};

export default dailyCommand;