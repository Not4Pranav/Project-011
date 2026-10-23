import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, Message, ChannelType } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { infoEmbed, errorEmbed, successEmbed, gameEmbed } from '../../utils/embeds.js';
import { getStarboardConfig, createStarboardConfig, updateStarboardConfig, createStarboardEntry, getStarboardEntry } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const starboardCommand: Command = {
  data: {
    name: 'starboard',
    description: 'Manage starboard',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      {
        name: 'setup',
        description: 'Set up starboard',
        type: 1,
        options: [
          { name: 'channel', description: 'Starboard channel', type: 7, required: true, channel_types: [0] },
          { name: 'threshold', description: 'Minimum stars to pin (default: 5)', type: 4, required: false, min_value: 1 },
          { name: 'emoji', description: 'Star emoji (default: ⭐)', type: 3, required: false },
        ],
      },
      {
        name: 'disable',
        description: 'Disable starboard',
        type: 1,
      },
      {
        name: 'config',
        description: 'Configure starboard',
        type: 1,
        options: [
          { name: 'threshold', description: 'Minimum stars to pin', type: 4, required: false, min_value: 1 },
          { name: 'emoji', description: 'Star emoji', type: 3, required: false },
          { name: 'self_star', description: 'Allow self-starring', type: 5, required: false },
        ],
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    switch (subcommand) {
      case 'setup':
        await handleSetup(interaction, client);
        break;
      case 'disable':
        await handleDisable(interaction, client);
        break;
      case 'config':
        await handleConfig(interaction, client);
        break;
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    // Not used for starboard
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  const threshold = interaction.options.getInteger('threshold') || 5;
  const emoji = interaction.options.getString('emoji') || '⭐';
  const guild = interaction.guild!;

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: 'Channel must be a text channel.', ephemeral: true });
    return;
  }

  await createStarboardConfig(guild.id, {
    enabled: true,
    channelId: channel.id,
    threshold,
    emoji,
    selfStar: false,
  });

  await interaction.reply({ content: `✅ Starboard set up in ${channel} with threshold ${threshold} ${emoji}`, ephemeral: true });
}

async function handleDisable(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  await updateStarboardConfig(guild.id, { enabled: false });
  await interaction.reply({ content: '❌ Starboard disabled.', ephemeral: true });
}

async function handleConfig(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const threshold = interaction.options.getInteger('threshold');
  const emoji = interaction.options.getString('emoji');
  const selfStar = interaction.options.getBoolean('self_star');

  const updates: any = { enabled: true };
  if (threshold !== null) updates.threshold = threshold;
  if (emoji) updates.emoji = emoji;
  if (selfStar !== null) updates.selfStar = selfStar;

  await updateStarboardConfig(guild.id, updates);
  await interaction.reply({ content: '✅ Starboard config updated.', ephemeral: true });
}

export default starboardCommand;