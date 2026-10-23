import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, errorEmbed } from '../../utils/embeds.js';
import { getQuotes, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const quotesCommand: Command = {
  data: {
    name: 'quotes',
    description: 'List saved quotes',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'Filter quotes by user', type: 6, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const targetUser = interaction.options.getUser('user');
    const guild = interaction.guild!;

    try {
      const guildConfig = await getGuildConfig(guild.id);
      
      if (!guildConfig) {
        await interaction.reply({ embeds: [errorEmbed('Server not configured.')], ephemeral: true });
        return;
      }

      const quotes = await getQuotes(guild.id, targetUser?.id);
      
      if (quotes.length === 0) {
        await interaction.reply({ embeds: [errorEmbed(targetUser ? `${targetUser.tag} has no quotes.` : 'No quotes saved in this server.')], ephemeral: true });
        return;
      }

      let description = '';
      for (let i = 0; i < Math.min(quotes.length, 10); i++) {
        const quote = quotes[i];
        const user = await client.users.fetch(quote.userId).catch(() => ({ tag: 'Unknown' }));
        const content = quote.content.length > 100 ? quote.content.slice(0, 100) + '...' : quote.content;
        description += `**${i + 1}.** ${user.tag} - ${content}\n*ID: ${quote.messageId}*\n\n`;
      }

      const embed = utilityEmbed(description)
        .setTitle(`${EMOJIS.QUOTE} Saved Quotes${targetUser ? ` by ${targetUser.tag}` : ''}`)
        .setFooter({ text: `Showing ${Math.min(quotes.length, 10)} of ${quotes.length} quotes` });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Quotes command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch quotes.')], ephemeral: true });
    }
  },
};

export default quotesCommand;