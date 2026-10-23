import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getAntinukeConfig, createAntinukeConfig, updateAntinukeConfig, createAntinukeLog, getAntinukeLogs, addToWhitelist, removeFromWhitelist, getWhitelist } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, ANTINUKE_ACTION_TYPES } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const antinukeCommand: Command = {
  data: {
    name: 'antinuke',
    description: 'Configure AntiNuke protection',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
    cooldown: 5000,
    options: [
      {
        name: 'setup',
        description: 'Set up AntiNuke',
        type: 1,
        options: [
          { name: 'log_channel', description: 'Channel for AntiNuke logs', type: 7, required: true, channel_types: [0] },
          { name: 'punishment', description: 'Punishment for triggers', type: 3, required: false, choices: [
            { name: 'Ban', value: 'BAN' },
            { name: 'Kick', value: 'KICK' },
            { name: 'Remove Roles', value: 'REMOVE_ROLES' },
          ]},
        ],
      },
      {
        name: 'disable',
        description: 'Disable AntiNuke',
        type: 1,
      },
      {
        name: 'config',
        description: 'Configure AntiNuke triggers',
        type: 1,
        options: [
          { name: 'channel_delete', description: 'Channel delete threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'channel_create', description: 'Channel create threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'channel_update', description: 'Channel update threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'role_delete', description: 'Role delete threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'role_create', description: 'Role create threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'role_update', description: 'Role update threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'ban_add', description: 'Ban threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'ban_remove', description: 'Unban threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'kick', description: 'Kick threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'bot_add', description: 'Bot add threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'webhook_create', description: 'Webhook create threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'emoji_delete', description: 'Emoji delete threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'emoji_create', description: 'Emoji create threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'emoji_update', description: 'Emoji update threshold (0 = disabled)', type: 4, required: false, min_value: 0, max_value: 50 },
          { name: 'timeout', description: 'Time window in seconds for thresholds', type: 4, required: false, min_value: 1, max_value: 3600 },
        ],
      },
      {
        name: 'whitelist',
        description: 'Manage whitelisted users/roles',
        type: 1,
        options: [
          {
            name: 'add',
            description: 'Add to whitelist',
            type: 1,
            options: [
              { name: 'target', description: 'User or role to whitelist', type: 9, required: true },
              { name: 'type', description: 'Whitelist type', type: 3, required: true, choices: [
                { name: 'All', value: 'ALL' },
                { name: 'Channel Delete', value: 'CHANNEL_DELETE' },
                { name: 'Channel Create', value: 'CHANNEL_CREATE' },
                { name: 'Channel Update', value: 'CHANNEL_UPDATE' },
                { name: 'Role Delete', value: 'ROLE_DELETE' },
                { name: 'Role Create', value: 'ROLE_CREATE' },
                { name: 'Role Update', value: 'ROLE_UPDATE' },
                { name: 'Ban Add', value: 'BAN_ADD' },
                { name: 'Ban Remove', value: 'BAN_REMOVE' },
                { name: 'Kick', value: 'KICK' },
                { name: 'Bot Add', value: 'BOT_ADD' },
                { name: 'Webhook Create', value: 'WEBHOOK_CREATE' },
                { name: 'Emoji Delete', value: 'EMOJI_DELETE' },
                { name: 'Emoji Create', value: 'EMOJI_CREATE' },
                { name: 'Emoji Update', value: 'EMOJI_UPDATE' },
              ]},
            ],
          },
          {
            name: 'remove',
            description: 'Remove from whitelist',
            type: 1,
            options: [
              { name: 'target', description: 'User or role to remove', type: 9, required: true },
              { name: 'type', description: 'Whitelist type (ALL to remove from all)', type: 3, required: true, choices: [
                { name: 'All', value: 'ALL' },
                { name: 'Channel Delete', value: 'CHANNEL_DELETE' },
                { name: 'Channel Create', value: 'CHANNEL_CREATE' },
                { name: 'Channel Update', value: 'CHANNEL_UPDATE' },
                { name: 'Role Delete', value: 'ROLE_DELETE' },
                { name: 'Role Create', value: 'ROLE_CREATE' },
                { name: 'Role Update', value: 'ROLE_UPDATE' },
                { name: 'Ban Add', value: 'BAN_ADD' },
                { name: 'Ban Remove', value: 'BAN_REMOVE' },
                { name: 'Kick', value: 'KICK' },
                { name: 'Bot Add', value: 'BOT_ADD' },
                { name: 'Webhook Create', value: 'WEBHOOK_CREATE' },
                { name: 'Emoji Delete', value: 'EMOJI_DELETE' },
                { name: 'Emoji Create', value: 'EMOJI_CREATE' },
                { name: 'Emoji Update', value: 'EMOJI_UPDATE' },
              ]},
            ],
          },
          {
            name: 'list',
            description: 'List whitelisted users/roles',
            type: 1,
          },
        ],
      },
      {
        name: 'logs',
        description: 'View AntiNuke logs',
        type: 1,
        options: [
          { name: 'limit', description: 'Number of logs to show (default: 10)', type: 4, required: false, min_value: 1, max_value: 50 },
        ],
      },
      {
        name: 'punishment',
        description: 'Set default punishment',
        type: 1,
        options: [
          { name: 'type', description: 'Punishment type', type: 3, required: true, choices: [
            { name: 'Ban', value: 'BAN' },
            { name: 'Kick', value: 'KICK' },
            { name: 'Remove Roles', value: 'REMOVE_ROLES' },
          ]},
        ],
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const guild = interaction.guild!;

    try {
      if (subcommandGroup === 'whitelist') {
        switch (subcommand) {
          case 'add':
            await handleWhitelistAdd(interaction, client);
            break;
          case 'remove':
            await handleWhitelistRemove(interaction, client);
            break;
          case 'list':
            await handleWhitelistList(interaction, client);
            break;
        }
        return;
      }

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
        case 'whitelist':
          // handled above
          break;
        case 'logs':
          await handleLogs(interaction, client);
          break;
        case 'punishment':
          await handlePunishment(interaction, client);
          break;
      }
    } catch (error) {
      logger.error('AntiNuke command error:', error);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    // Not used for antinuke
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const logChannel = interaction.options.getChannel('log_channel', true);
  const punishment = interaction.options.getString('punishment') || 'BAN';
  const guild = interaction.guild!;

  if (logChannel.type !== 0) {
    await interaction.reply({ content: 'Log channel must be a text channel.', ephemeral: true });
    return;
  }

  await createAntinukeConfig(guild.id, {
    logChannelId: logChannel.id,
    enabled: true,
    punishment: punishment as any,
  });

  await interaction.reply({ content: `✅ AntiNuke set up with log channel ${logChannel} and punishment ${punishment}`, ephemeral: true });
}

async function handleDisable(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  await updateAntinukeConfig(guild.id, { enabled: false });
  await interaction.reply({ content: '❌ AntiNuke disabled.', ephemeral: true });
}

async function handleConfig(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  
  const updates: any = { enabled: true };
  const thresholds = [
    'channel_delete', 'channel_create', 'channel_update',
    'role_delete', 'role_create', 'role_update',
    'ban_add', 'ban_remove', 'kick',
    'bot_add', 'webhook_create',
    'emoji_delete', 'emoji_create', 'emoji_update',
    'timeout'
  ];

  for (const key of thresholds) {
    const value = interaction.options.getInteger(key);
    if (value !== null) updates[key] = value;
  }

  await updateAntinukeConfig(guild.id, updates);
  await interaction.reply({ content: '✅ AntiNuke config updated.', ephemeral: true });
}

async function handleWhitelistAdd(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const target = interaction.options.getUser('target') || interaction.options.getRole('target');
  const type = interaction.options.getString('type', true);
  const guild = interaction.guild!;

  if (!target) {
    await interaction.reply({ content: 'Invalid target.', ephemeral: true });
    return;
  }

  await addToWhitelist(guild.id, target.id, type);
  await interaction.reply({ content: `✅ Added ${target} to whitelist for ${type}`, ephemeral: true });
}

async function handleWhitelistRemove(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const target = interaction.options.getUser('target') || interaction.options.getRole('target');
  const type = interaction.options.getString('type', true);
  const guild = interaction.guild!;

  if (!target) {
    await interaction.reply({ content: 'Invalid target.', ephemeral: true });
    return;
  }

  await removeFromWhitelist(guild.id, target.id, type);
  await interaction.reply({ content: `✅ Removed ${target} from whitelist for ${type}`, ephemeral: true });
}

async function handleWhitelistList(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const whitelist = await getWhitelist(guild.id) as Record<string, { id: string; type: string }[]>;

  if (!whitelist || Object.keys(whitelist).length === 0) {
    await interaction.reply({ content: 'No whitelisted users/roles.', ephemeral: true });
    return;
  }

  let description = '';
  for (const [type, entries] of Object.entries(whitelist)) {
    if (entries.length > 0) {
      description += `**${type}:** ${entries.map(e => e.id.startsWith('<@') ? e.id : `<@${e.id}>`).join(', ')}\n`;
    }
  }

  const embed = infoEmbed(description).setTitle(`${EMOJIS.SHIELD} AntiNuke Whitelist`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleLogs(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const limit = interaction.options.getInteger('limit') || 10;
  const guild = interaction.guild!;

  const logs = await getAntinukeLogs(guild.id, limit);

  if (logs.length === 0) {
    await interaction.reply({ content: 'No AntiNuke logs.', ephemeral: true });
    return;
  }

  const embed = infoEmbed(
    logs.map(l => 
      `**${l.actionType}** | <@${l.executorId}> | <t:${Math.floor(l.createdAt.getTime() / 1000)}:R>\n` +
      `Target: ${l.targetId} | Punished: ${l.punished ? 'Yes' : 'No'}`
    ).join('\n\n')
  ).setTitle(`${EMOJIS.SHIELD} AntiNuke Logs`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handlePunishment(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const punishment = interaction.options.getString('type', true);
  const guild = interaction.guild!;

  await updateAntinukeConfig(guild.id, { punishment: punishment as any });
  await interaction.reply({ content: `✅ Default punishment set to ${punishment}`, ephemeral: true });
}

export default antinukeCommand;