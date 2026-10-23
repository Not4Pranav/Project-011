import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createQuote, getQuotes, getQuoteByMessageId, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const quoteCommand: Command = {
  data: {
    name: 'quote',
    description: 'Create a quote from a message',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'message_id', description: 'Message ID to quote', type: 3, required: true },
      { name: 'name', description: 'Custom name for the quote', type: 3, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const messageId = interaction.options.getString('message_id', true);
    const customName = interaction.options.getString('name');
    const guild = interaction.guild!;

    try {
      const guildConfig = await getGuildConfig(guild.id);
      
      if (!guildConfig) {
        await interaction.reply({ embeds: [errorEmbed('Server not configured.')], ephemeral: true });
        return;
      }

      // Check if quote already exists
      const existing = await getQuoteByMessageId(messageId);
      if (existing) {
        await interaction.reply({ embeds: [errorEmbed('This message has already been quoted.')], ephemeral: true });
        return;
      }

      // Try to fetch the message
      let message: any = null;
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased()) {
          try {
            message = await channel.messages.fetch(messageId);
            if (message) break;
          } catch {
            // Continue searching
          }
        }
      }

      if (!message) {
        await interaction.reply({ embeds: [errorEmbed('Message not found. Make sure the message ID is correct and the bot has access to the channel.')], ephemeral: true });
        return;
      }

      const quote = await createQuote({
        guildId: guild.id,
        messageId: message.id,
        userId: message.author.id,
        content: message.content,
      });

      const embed = utilityEmbed(
        `**Author:** ${message.author.tag}\n` +
        `**Channel:** ${message.channel}\n` +
        `**Date:** <t:${Math.floor(message.createdTimestamp / 1000)}:R>\n\n` +
        `**Content:**\n${message.content || '*No text content*'}`
      ).setTitle(`${EMOJIS.QUOTE} Quote Saved${customName ? ` as "${customName}"` : ''}`)
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() });

      if (message.attachments.size > 0) {
        embed.setImage(message.attachments.first()!.url);
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Quote command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to create quote.')], ephemeral: true });
    }
  },
};

export default quoteCommand;