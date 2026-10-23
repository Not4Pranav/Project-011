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

const buyCommand: Command = {
  data: {
    name: 'buy',
    description: 'Buy an item from the shop',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'item_id', description: 'Item ID to purchase', type: 3, required: true, choices: shopItems.map(i => ({ name: i.name, value: i.id })) },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const itemId = interaction.options.getString('item_id', true);
    const user = interaction.user;
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const item = shopItems.find(i => i.id === itemId);
      if (!item) {
        await interaction.reply({ embeds: [errorEmbed('Item not found.')], ephemeral: true });
        return;
      }

      const gameUser = await getOrCreateGameUser(gameConfig.id, user.id);
      
      if (gameUser.balance < item.price) {
        await interaction.reply({ embeds: [errorEmbed(`Insufficient balance. You have ${gameUser.balance} ${EMOJIS.COINS}, need ${item.price} ${EMOJIS.COINS}.`)], ephemeral: true });
        return;
      }

      await updateGameUser(gameConfig.id, user.id, {
        balance: { decrement: item.price },
      });

      const updatedUser = await getOrCreateGameUser(gameConfig.id, user.id);

      const embed = successEmbed(
        `**Item:** ${item.name}\n` +
        `**Price:** ${item.price.toLocaleString()} ${EMOJIS.COINS}\n` +
        `**New Balance:** ${updatedUser.balance.toLocaleString()} ${EMOJIS.COINS}\n\n` +
        `*Contact server staff to claim your item!*`
      ).setTitle(`${EMOJIS.SHOP} Purchase Successful`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Buy command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to purchase item.')], ephemeral: true });
    }
  },
};

export default buyCommand;