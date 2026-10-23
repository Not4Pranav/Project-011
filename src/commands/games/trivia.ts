import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, LIMITS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const triviaQuestions = [
  { question: 'What is the capital of France?', correct: 'Paris', options: ['London', 'Berlin', 'Paris', 'Madrid'] },
  { question: 'Which planet is known as the Red Planet?', correct: 'Mars', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'] },
  { question: 'What is 2 + 2?', correct: '4', options: ['3', '4', '5', '6'] },
  { question: 'Who wrote "Romeo and Juliet"?', correct: 'William Shakespeare', options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'] },
  { question: 'What is the largest ocean on Earth?', correct: 'Pacific Ocean', options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'] },
  { question: 'How many continents are there?', correct: '7', options: ['5', '6', '7', '8'] },
  { question: 'What is the chemical symbol for gold?', correct: 'Au', options: ['Ag', 'Au', 'Fe', 'Cu'] },
  { question: 'Which country invented pizza?', correct: 'Italy', options: ['USA', 'Italy', 'Greece', 'France'] },
  { question: 'What year did World War II end?', correct: '1945', options: ['1943', '1944', '1945', '1946'] },
  { question: 'What is the hardest natural substance?', correct: 'Diamond', options: ['Gold', 'Iron', 'Diamond', 'Platinum'] },
  { question: 'How many sides does a hexagon have?', correct: '6', options: ['5', '6', '7', '8'] },
  { question: 'What is the largest mammal?', correct: 'Blue Whale', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Hippo'] },
  { question: 'Which gas do plants absorb from the atmosphere?', correct: 'Carbon Dioxide', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'] },
  { question: 'What is the square root of 64?', correct: '8', options: ['6', '7', '8', '9'] },
  { question: 'Who painted the Mona Lisa?', correct: 'Leonardo da Vinci', options: ['Pablo Picasso', 'Vincent van Gogh', 'Leonardo da Vinci', 'Michelangelo'] },
];

const activeTrivia = new Map<string, { question: typeof triviaQuestions[0]; message: any; answered: boolean }>();

const triviaCommand: Command = {
  data: {
    name: 'trivia',
    description: 'Play a trivia question',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: LIMITS.TRIVIA_COOLDOWN,
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

      const question = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];
      const shuffledOptions = [...question.options].sort(() => Math.random() - 0.5);
      
      const buttons = shuffledOptions.map((option, index) => 
        new ButtonBuilder()
          .setCustomId(`trivia_${option}`)
          .setLabel(option)
          .setStyle(ButtonStyle.Primary)
      );

      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      for (let i = 0; i < buttons.length; i += 2) {
        rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons.slice(i, i + 2)));
      }

      const embed = gameEmbed(
        `**Question:** ${question.question}\n\n` +
        `**Reward:** 100 ${EMOJIS.COINS} + 25 XP\n` +
        `You have 30 seconds to answer!`
      ).setTitle(`${EMOJIS.TRIVIA} Trivia Time!`);

      const message = await interaction.reply({ embeds: [embed], components: rows, fetchReply: true });
      
      activeTrivia.set(message.id, { question, message, answered: false });

      const collector = message.createMessageComponentCollector({ 
        componentType: ComponentType.Button, 
        time: 30000 
      });

      collector.on('collect', async (i) => {
        if (activeTrivia.get(message.id)?.answered) return;
        
        const selected = i.customId.replace('trivia_', '');
        const isCorrect = selected === question.correct;
        
        activeTrivia.get(message.id)!.answered = true;
        collector.stop();

        const gameUser = await getOrCreateGameUser(gameConfig.id, user.id);
        let reward = 0;
        let xpGain = 0;
        
        if (isCorrect) {
          reward = 100;
          xpGain = 25;
          await updateGameUser(gameConfig.id, user.id, {
            balance: { increment: reward },
            xp: { increment: xpGain },
          });
        }

        const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);
        
        const resultEmbed = gameEmbed(
          `**Question:** ${question.question}\n` +
          `**Your Answer:** ${selected}\n` +
          `**Correct Answer:** ${question.correct}\n\n` +
          `**${isCorrect ? '✅ Correct!' : '❌ Incorrect!'}\n` +
          `${isCorrect ? `**Reward:** ${reward} ${EMOJIS.COINS} + ${xpGain} XP` : ''}\n` +
          `**New Balance:** ${updatedUser.balance.toLocaleString()} ${EMOJIS.COINS}`
        ).setTitle(isCorrect ? `${EMOJIS.SUCCESS} Correct!` : `${EMOJIS.ERROR} Wrong!`)
          .setColor(isCorrect ? COLORS.SUCCESS : COLORS.ERROR);

        await i.update({ embeds: [resultEmbed], components: [] });
      });

      collector.on('end', async (collected, reason) => {
        if (reason === 'time' && !activeTrivia.get(message.id)?.answered) {
          activeTrivia.get(message.id)!.answered = true;
          const timeoutEmbed = gameEmbed(
            `**Question:** ${question.question}\n` +
            `**Correct Answer:** ${question.correct}\n\n` +
            `⏰ Time's up! No answer received.`
          ).setTitle(`${EMOJIS.WARNING} Time's Up!`).setColor(COLORS.WARNING);
          
          await message.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
        }
        activeTrivia.delete(message.id);
      });

    } catch (error) {
      logger.error('Trivia command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to start trivia.')], ephemeral: true });
    }
  },
};

export default triviaCommand;