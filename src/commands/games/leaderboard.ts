import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed } from '../../utils/embeds.js';
import { getGameConfig, getLeaderboard } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LEADERBOARD_TYPES } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const leaderboardCommand: Command = {
  data: {
    name: 'leaderboard',
    description: 'View server leaderboards',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 10000,
    options: [
      { name: 'type', description: 'Leaderboard type', type: 3, required: false, choices: [
        { name: 'Balance', value: 'BALANCE' },
        { name: 'XP', value: 'XP' },
        { name: 'Wins', value: 'WINS' },
        { name: 'Games Played', value: 'GAMES_PLAYED' },
      ]},
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const type = (interaction.options.getString('type') as keyof typeof LEADERBOARD_TYPES) || 'BALANCE';
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const leaders = await getLeaderboard(gameConfig.id, type, 10);
      
      if (leaders.length === 0) {
        await interaction.reply({ embeds: [errorEmbed('No data available for this leaderboard.')], ephemeral: true });
        return;
      }

      const typeEmojis: Record<string, string> = {
        [LEADERBOARD_TYPES.BALANCE]: EMOJIS.COINS,
        [LEADERBOARD_TYPES.XP]: EMOJIS.XP,
        [LEADERBOARD_TYPES.WINS]: EMOJIS.LEVEL,
        [LEADERBOARD_TYPES.GAMES_PLAYED]: EMOJIS.SLOTS,
      };

      const typeLabels: Record<string, string> = {
        [LEADERBOARD_TYPES.BALANCE]: 'Balance',
        [LEADERBOARD_TYPES.XP]: 'XP',
        [LEADERBOARD_TYPES.WINS]: 'Wins',
        [LEADERBOARD_TYPES.GAMES_PLAYED]: 'Games Played',
      };

      let description = '';
      for (let i = 0; i < leaders.length; i++) {
        const leader = leaders[i];
        const user = await client.users.fetch(leader.userId).catch(() => ({ tag: 'Unknown User' }));
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
        description += `${medal} **${user.tag}** - ${leader.value.toLocaleString()} ${typeEmojis[type]}\n`;
      }

      const embed = gameEmbed(description)
        .setTitle(`${typeEmojis[type]} ${typeLabels[type]} Leaderboard`)
        .setFooter({ text: `Top ${leaders.length} players` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Leaderboard command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch leaderboard.')], ephemeral: true });
    }
  },
};

export default leaderboardCommand;