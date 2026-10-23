import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, errorEmbed } from '../../utils/embeds.js';
import { getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, COLORS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const esnipeCommand: Command = {
  data: {
    name: 'esnipe',
    description: 'Show the last edited message in a channel',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'channel', description: 'Channel to snipe (default: current)', type: 7, required: false, channel_types: [0] },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    await interaction.reply({ embeds: [errorEmbed('Edit snipe is not yet implemented. Use /snipe for deleted messages.')], ephemeral: true });
  },
};

export default esnipeCommand;