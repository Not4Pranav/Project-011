import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const hangmanWords = [
  'javascript', 'python', 'discord', 'programming', 'computer', 'keyboard', 
  'mouse', 'monitor', 'server', 'database', 'network', 'internet',
  'software', 'hardware', 'algorithm', 'function', 'variable', 'constant',
  'object', 'array', 'string', 'boolean', 'integer', 'float',
  'loop', 'condition', 'statement', 'expression', 'operator', 'syntax',
  'compile', 'debug', 'deploy', 'github', 'git', 'repository',
  'branch', 'commit', 'merge', 'conflict', 'resolve', 'push',
];

const hangmanStages = [
  `  +---+
  |   |
      |
      |
      |
      |
=========`,
  `  +---+
  |   |
  O   |
      |
      |
      |
=========`,
  `  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
  `  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
  `  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
  `  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
  `  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========`,
];

interface HangmanGame {
  word: string;
  guessed: Set<string>;
  wrongGuesses: number;
  maxWrong: number;
  message: any;
  userId: string;
  guildId: string;
  bet: number;
}

const activeHangman = new Map<string, HangmanGame>();

function createDisplay(word: string, guessed: Set<string>): string {
  return word.split('').map(c => guessed.has(c) ? c : '_').join(' ');
}

function createKeyboard(guessed: Set<string>): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  
  for (let i = 0; i < letters.length; i += 7) {
    const rowLetters = letters.slice(i, i + 7);
    const buttons = rowLetters.map(letter => 
      new ButtonBuilder()
        .setCustomId(`hangman_${letter}`)
        .setLabel(letter.toUpperCase())
        .setStyle(guessed.has(letter) ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(guessed.has(letter))
    );
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));
  }
  return rows;
}

const hangmanCommand: Command = {
  data: {
    name: 'hangman',
    description: 'Play Hangman',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.HANGMAN_COOLDOWN,
    options: [
      { name: 'bet', description: 'Amount to bet (optional)', type: 4, required: false, min_value: 10 },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const user = interaction.user;
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

      const word = hangmanWords[Math.floor(Math.random() * hangmanWords.length)];
      const game: HangmanGame = {
        word,
        guessed: new Set(),
        wrongGuesses: 0,
        maxWrong: 6,
        message: null,
        userId: user.id,
        guildId: guild.id,
        bet,
      };

      const display = createDisplay(word, game.guessed);
      const keyboard = createKeyboard(game.guessed);
      
      const embed = gameEmbed(
        `\`\`\`${hangmanStages[game.wrongGuesses]}\`\`\`\n` +
        `**Word:** ${display}\n` +
        `**Wrong Guesses:** ${game.wrongGuesses}/${game.maxWrong}\n` +
        `${bet > 0 ? `**Bet:** ${bet} ${EMOJIS.COINS}\n` : ''}` +
        `Click a letter to guess!`
      ).setTitle(`${EMOJIS.HANGMAN} Hangman`);

      const message = await interaction.reply({ embeds: [embed], components: keyboard, fetchReply: true });
      game.message = message;
      activeHangman.set(message.id, game);

      const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 60000 
      });

      collector.on('collect', async (i) => {
        if (i.user.id !== user.id) {
          await i.reply({ content: 'This is not your game!', ephemeral: true });
          return;
        }

        const letter = i.customId.replace('hangman_', '');
        game.guessed.add(letter);

        if (!word.includes(letter)) {
          game.wrongGuesses++;
        }

        const display = createDisplay(word, game.guessed);
        const isWon = !display.includes('_');
        const isLost = game.wrongGuesses >= game.maxWrong;

        if (isWon || isLost) {
          collector.stop();
          
          let reward = 0;
          let xpGain = 0;
          let netGain = 0;
          
          if (isWon) {
            reward = bet > 0 ? bet * 2 : 150;
            xpGain = 50;
            netGain = bet > 0 ? bet : reward;
          } else if (bet > 0) {
            netGain = -bet;
          }
          
          if (bet > 0 || isWon) {
            await updateGameUser(gameConfig.id, user.id, {
              balance: { increment: netGain },
              xp: { increment: xpGain },
            });
          }
          
          const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);
          
          const resultEmbed = gameEmbed(
            `\`\`\`${hangmanStages[game.wrongGuesses]}\`\`\`\n` +
            `**Word:** ${word}\n\n` +
            `**${isWon ? '🎉 You Won!' : '💀 Game Over!'}\n` +
            `${isWon ? `**Reward:** ${reward} ${EMOJIS.COINS} + ${xpGain} XP\n` : ''}` +
            `**New Balance:** ${updatedUser.balance.toLocaleString()} ${EMOJIS.COINS}`
          ).setTitle(isWon ? `${EMOJIS.SUCCESS} Victory!` : `${EMOJIS.ERROR} Defeat!`)
            .setColor(isWon ? COLORS.SUCCESS : COLORS.ERROR);

          await i.update({ embeds: [resultEmbed], components: [] });
          activeHangman.delete(message.id);
          return;
        }

        const keyboard = createKeyboard(game.guessed);
        const embed = gameEmbed(
          `\`\`\`${hangmanStages[game.wrongGuesses]}\`\`\`\n` +
          `**Word:** ${display}\n` +
          `**Wrong Guesses:** ${game.wrongGuesses}/${game.maxWrong}\n` +
          `${bet > 0 ? `**Bet:** ${bet} ${EMOJIS.COINS}\n` : ''}` +
          `Click a letter to guess!`
        ).setTitle(`${EMOJIS.HANGMAN} Hangman`);

        await i.update({ embeds: [embed], components: keyboard });
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && activeHangman.has(message.id)) {
          const timeoutEmbed = gameEmbed(
            `\`\`\`${hangmanStages[game.wrongGuesses]}\`\`\`\n` +
            `**Word:** ${word}\n\n` +
            `⏰ Time's up! Game ended.`
          ).setTitle(`${EMOJIS.WARNING} Time's Up!`).setColor(COLORS.WARNING);
          
          await message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
          activeHangman.delete(message.id);
        }
      });

    } catch (error) {
      logger.error('Hangman command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to start hangman.')], ephemeral: true });
    }
  },
};

export default hangmanCommand;