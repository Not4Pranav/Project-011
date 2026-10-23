import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const workJobs = [
  { name: 'Developer', min: 300, max: 800 },
  { name: 'Designer', min: 250, max: 600 },
  { name: 'Streamer', min: 100, max: 1000 },
  { name: 'Cashier', min: 150, max: 400 },
  { name: 'Teacher', min: 200, max: 500 },
  { name: 'Chef', min: 180, max: 450 },
  { name: 'Driver', min: 200, max: 550 },
  { name: 'Writer', min: 150, max: 600 },
  { name: 'Artist', min: 100, max: 700 },
  { name: 'Tester', min: 200, max: 500 },
];

const workCommand: Command = {
  data: {
    name: 'work',
    description: 'Work to earn money',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.WORK_COOLDOWN,
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
      const job = workJobs[Math.floor(Math.random() * workJobs.length)];
      const earnings = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;
      const xpGain = Math.floor(Math.random() * 20) + 10;

      await updateGameUser(gameConfig.id, user.id, {
        balance: { increment: earnings },
        xp: { increment: xpGain },
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
        `**Job:** ${job.name}\n` +
        `**Earned:** ${earnings.toLocaleString()} ${EMOJIS.COINS}\n` +
        `**XP Gained:** ${xpGain} ${EMOJIS.XP}${levelUpMessage}`
      ).setTitle(`${EMOJIS.WORK} Work Complete!`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Work command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to work.')], ephemeral: true });
    }
  },
};

export default workCommand;