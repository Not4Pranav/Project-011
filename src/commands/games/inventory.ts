import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed } from '../../utils/embeds.js';
import { getGameConfig, getOrCreateGameUser } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const shopItems = [
  { id: 'role_color', name: 'Custom Role Color', price: 5000, description: 'Get a custom color for your role' },
  { id: 'emoji_slot', name: 'Custom Emoji Slot', price: 10000, description: 'Add a custom emoji to the server' },
  { id: 'xp_boost', name: 'XP Boost (24h)', price: 2500, description: 'Double XP gain for 24 hours' },
  { id: 'daily_boost', name: 'Daily Boost', price: 7500, description: 'Increase daily reward by 50% for 7 days' },
  { id: 'vip_role', name: 'VIP Role', price: 50000, description: 'Exclusive VIP role with perks' },
];

const inventoryCommand: Command = {
  data: {
    name: 'inventory',
    description: 'View your inventory',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to view inventory for', type: 6, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const guild = interaction.guild!;

    try {
      const gameConfig = await getGameConfig(guild.id);
      
      if (!gameConfig || !gameConfig.economyEnabled) {
        await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
        return;
      }

      const gameUser = await getOrCreateGameUser(gameConfig.id, targetUser.id);

      // Inventory is stored as purchased items - for now we show balance and items
      const embed = gameEmbed(
        `**User:** ${targetUser.tag}\n` +
        `**Balance:** ${gameUser.balance.toLocaleString()} ${EMOJIS.COINS}\n` +
        `**XP:** ${gameUser.xp.toLocaleString()} ${EMOJIS.XP}\n` +
        `**Level:** ${gameUser.level} ${EMOJIS.LEADERBOARD}\n\n` +
        `**Purchased Items:**\n*No items purchased yet*\n\n` +
        `Use /shop to browse available items and /buy <item> to purchase.`
      ).setTitle(`${EMOJIS.INVENTORY} ${targetUser.tag}'s Inventory`);

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('Inventory command error:', error);
      await interaction.reply({ embeds: [errorEmbed('Failed to load inventory.')], ephemeral: true });
    }
  },
};

export default inventoryCommand;