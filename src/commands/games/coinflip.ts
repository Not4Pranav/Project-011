import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const coinflipCommand: Command = {
  data: {
    name: 'coinflip',
    description: 'Flip a coin and bet on the outcome',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.COINFLIP_COOLDOWN,
    options: [
      { name: 'bet', description: 'Amount to bet', type: 4, required: true, min_value: 10 },
      { name: 'choice', description: 'Heads or tails', type: 3, required: true, choices: [
        { name: 'Heads', value: 'heads' },
        { name: 'Tails', value: 'tails' },
      ]},
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.user;
    const bet = interaction.options.getInteger('bet', true);
    const choice = interaction.options.getString('choice', true) as 'heads' | 'tails';
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const gameUser = await getOrCreateGameUser(gameConfig.id, user.id);
      
      if (gameUser.balance < bet) {
        await interaction.reply({ embeds: [errorEmbed(`Insufficient balance. You have ${gameUser.balance} ${EMOJIS.COINS}.`)], ephemeral: true });
        return;
      }

      const minBet = 10;
      if (bet < minBet) {
        await interaction.reply({ embeds: [errorEmbed(`Minimum bet is ${minBet} ${EMOJIS.COINS}.`)], ephemeral: true });
        return;
      }

      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = result === choice;
      const netGain = won ? bet : -bet;

      await updateGameUser(gameConfig.id, user.id, {
        balance: { increment: netGain },
      });

      const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);
      const resultEmoji = result === 'heads' ? '🦅' : '🦅';
      const choiceEmoji = choice === 'heads' ? '🦅' : '🦅';

      const embed = gameEmbed(
        `**Your Choice:** ${choiceEmoji} ${choice.charAt(0).toUpperCase() + choice.slice(1)}\n` +
        `**Result:** ${resultEmoji} ${result.charAt(0).toUpperCase() + result.slice(1)}\n\n` +
        `**${won ? '🎉 You Won!' : '💸 You Lost!'}\n` +
        `**Bet:** ${bet} ${EMOJIS.COINS}\n` +
        `**${won ? 'Won' : 'Lost'}:** ${Math.abs(netGain).toLocaleString()} ${EMOJIS.COINS}\n` +
        `**New Balance:** ${updatedUser.balance.toLocaleString()} ${EMOJIS.COINS}`
      ).setTitle(`${EMOJIS.COINFLIP} Coin Flip`).setColor(won ? COLORS.SUCCESS : COLORS.ERROR);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Coinflip command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to flip coin.')], ephemeral: true });
    }
  },
};

export default coinflipCommand;