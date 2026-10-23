import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser, updateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const shopItems = [
  { id: 'role_color', name: 'Custom Role Color', price: 5000, description: 'Get a custom color for your role' },
  { id: 'emoji_slot', name: 'Custom Emoji Slot', price: 10000, description: 'Add a custom emoji to the server' },
  { id: 'xp_boost', name: 'XP Boost (24h)', price: 2500, description: 'Double XP gain for 24 hours' },
  { id: 'daily_boost', name: 'Daily Boost', price: 7500, description: 'Increase daily reward by 50% for 7 days' },
  { id: 'vip_role', name: 'VIP Role', price: 50000, description: 'Exclusive VIP role with perks' },
];

const shopCommand: Command = {
  data: {
    name: 'shop',
    description: 'View the server shop',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      let description = '';
      for (const item of shopItems) {
        description += `**${item.name}** - ${item.price.toLocaleString()} ${EMOJIS.COINS}\n${item.description}\n\n`;
      }

      const embed = gameEmbed(description)
        .setTitle(`${EMOJIS.SHOP} Server Shop`)
        .setFooter({ text: 'Use /buy <item_id> to purchase an item' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Shop command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to load shop.')], ephemeral: true });
    }
  },
};

export default shopCommand;