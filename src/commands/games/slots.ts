import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const slotSymbols = ['🍒', '🍋', '🍊', '🍇', '💎', '7️⃣'];
const slotWeights = [30, 25, 20, 15, 5, 5]; // Total = 100

function spinSlot(): string {
  const rand = Math.random() * 100;
  let cumulative = 0;
  for (let i = 0; i < slotSymbols.length; i++) {
    cumulative += slotWeights[i];
    if (rand < cumulative) return slotSymbols[i];
  }
  return slotSymbols[0];
}

function calculatePayout(slots: string[], bet: number): { multiplier: number; message: string } {
  if (slots[0] === slots[1] && slots[1] === slots[2]) {
    // Jackpot
    if (slots[0] === '7️⃣') return { multiplier: 50, message: '🎰 JACKPOT! Triple 7s!' };
    if (slots[0] === '💎') return { multiplier: 20, message: '💎 DIAMOND JACKPOT!' };
    return { multiplier: 10, message: '🎉 TRIPLE MATCH!' };
  }
  if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
    return { multiplier: 2, message: '✨ Double match!' };
  }
  return { multiplier: 0, message: '💸 No match. Better luck next time!' };
}

const slotsCommand: Command = {
  data: {
    name: 'slots',
    description: 'Play the slot machine',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.SLOTS_COOLDOWN,
    options: [
      { name: 'bet', description: 'Amount to bet', type: 4, required: true, min_value: 10 },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.user;
    const bet = interaction.options.getInteger('bet', true);
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

      // Spin
      const slots = [spinSlot(), spinSlot(), spinSlot()];
      const { multiplier, message } = calculatePayout(slots, bet);
      const winnings = bet * multiplier;
      const netGain = winnings - bet;

      await updateGameUser(gameConfig.id, user.id, {
        balance: { increment: netGain },
      });

      const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);
      const isWin = multiplier > 0;
      const color = isWin ? COLORS.SUCCESS : COLORS.ERROR;

      const embed = gameEmbed(
        `| ${slots[0]} | ${slots[1]} | ${slots[2]} |\n\n` +
        `${message}\n` +
        `**Bet:** ${bet} ${EMOJIS.COINS}\n` +
        `**${isWin ? 'Won' : 'Lost'}:** ${Math.abs(netGain).toLocaleString()} ${EMOJIS.COINS}\n` +
        `**New Balance:** ${updatedUser.balance.toLocaleString()} ${EMOJIS.COINS}`
      ).setTitle(`${EMOJIS.SLOTS} Slot Machine`).setColor(color);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Slots command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to play slots.')], ephemeral: true });
    }
  },
};

export default slotsCommand;