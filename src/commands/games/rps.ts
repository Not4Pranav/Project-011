import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

type RpsChoice = 'rock' | 'paper' | 'scissors';

const rpsEmojis: Record<RpsChoice, string> = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️',
};

const rpsBeats: Record<RpsChoice, RpsChoice> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

const rpsCommand: Command = {
  data: {
    name: 'rps',
    description: 'Play Rock Paper Scissors',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.RPS_COOLDOWN,
    options: [
      { name: 'choice', description: 'Your choice', type: 3, required: true, choices: [
        { name: 'Rock', value: 'rock' },
        { name: 'Paper', value: 'paper' },
        { name: 'Scissors', value: 'scissors' },
      ]},
      { name: 'bet', description: 'Amount to bet (optional)', type: 4, required: false, min_value: 10 },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.user;
    const choice = interaction.options.getString('choice', true) as RpsChoice;
    const bet = interaction.options.getInteger('bet') || 0;
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const gameUser = await getOrCreateGameUser(gameConfig.id, user.id);
      
      if (bet > 0) {
        if (gameUser.balance < bet) {
          await interaction.reply({ embeds: [errorEmbed(`Insufficient balance. You have ${gameUser.balance} ${EMOJIS.COINS}.`)], ephemeral: true });
          return;
        }
        if (bet < 10) {
          await interaction.reply({ embeds: [errorEmbed('Minimum bet is 10 coins.')], ephemeral: true });
          return;
        }
      }

      const botChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)] as RpsChoice;
      
      let result: 'win' | 'lose' | 'tie';
      if (choice === botChoice) {
        result = 'tie';
      } else if (rpsBeats[choice] === botChoice) {
        result = 'win';
      } else {
        result = 'lose';
      }

      let netGain = 0;
      if (bet > 0) {
        if (result === 'win') netGain = bet;
        else if (result === 'lose') netGain = -bet;
        
        await updateGameUser(gameConfig.id, user.id, {
          balance: { increment: netGain },
        });
      }

      const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);

      const resultMessages = {
        win: '🎉 You Win!',
        lose: '💸 You Lose!',
        tie: '🤝 It\'s a Tie!',
      };

      const colors = {
        win: COLORS.SUCCESS,
        lose: COLORS.ERROR,
        tie: COLORS.WARNING,
      };

      let description = `**You:** ${rpsEmojis[choice]} ${choice.charAt(0).toUpperCase() + choice.slice(1)}\n` +
        `**Bot:** ${rpsEmojis[botChoice]} ${botChoice.charAt(0).toUpperCase() + botChoice.slice(1)}\n\n` +
        `**${resultMessages[result]}**`;

      if (bet > 0) {
        description += `\n**Bet:** ${bet} ${EMOJIS.COINS}\n` +
          `**${result === 'win' ? 'Won' : result === 'lose' ? 'Lost' : 'Returned'}:** ${Math.abs(netGain).toLocaleString()} ${EMOJIS.COINS}\n` +
          `**New Balance:** ${updatedUser.balance.toLocaleString()} ${EMOJIS.COINS}`;
      }

      const embed = gameEmbed(description)
        .setTitle(`${EMOJIS.RPS} Rock Paper Scissors`)
        .setColor(colors[result]);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('RPS command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to play RPS.')], ephemeral: true });
    }
  },
};

export default rpsCommand;