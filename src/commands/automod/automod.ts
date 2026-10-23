import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getAutomodConfig, createAutomodConfig, updateAutomodConfig, createAutomodRule, getAutomodRules, deleteAutomodRule, updateAutomodRule } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, AUTOMOD_ACTION_TYPES, AUTOMOD_TRIGGER_TYPES } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const automodCommand: Command = {
  data: {
    name: 'automod',
    description: 'Configure AutoMod rules',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
    cooldown: 5000,
    options: [
      {
        name: 'setup',
        description: 'Set up AutoMod',
        type: 1,
        options: [
          { name: 'log_channel', description: 'Channel for AutoMod logs', type: 7, required: true, channel_types: [0] },
        ],
      },
      {
        name: 'disable',
        description: 'Disable AutoMod',
        type: 1,
      },
      {
        name: 'rule',
        description: 'Manage AutoMod rules',
        type: 1,
        options: [
          {
            name: 'add',
            description: 'Add a new rule',
            type: 1,
            options: [
              { name: 'name', description: 'Rule name', type: 3, required: true },
              { name: 'type', description: 'Rule type', type: 3, required: true, choices: [
                { name: 'Keyword', value: 'KEYWORD' },
                { name: 'Regex', value: 'REGEX' },
                { name: 'Spam', value: 'SPAM' },
                { name: 'Mention Spam', value: 'MENTION_SPAM' },
                { name: 'Link', value: 'LINK' },
                { name: 'Invite', value: 'INVITE' },
                { name: 'Attachment', value: 'ATTACHMENT' },
                { name: 'Emoji', value: 'EMOJI' },
                { name: 'Caps', value: 'CAPS' },
                { name: 'Newlines', value: 'NEWLINES' },
                { name: 'Zalgo', value: 'ZALGO' },
              ]},
              { name: 'trigger', description: 'Trigger content (keywords comma-separated, or regex pattern)', type: 3, required: true },
              { name: 'action', description: 'Action to take', type: 3, required: true, choices: [
                { name: 'Block Message', value: 'BLOCK_MESSAGE' },
                { name: 'Timeout', value: 'TIMEOUT' },
                { name: 'Alert', value: 'ALERT' },
                { name: 'Delete', value: 'DELETE' },
              ]},
              { name: 'timeout_duration', description: 'Timeout duration in minutes (for TIMEOUT action)', type: 4, required: false, min_value: 1, max_value: 40320 },
              { name: 'exempt_roles', description: 'Roles exempt from this rule (comma-separated IDs)', type: 3, required: false },
              { name: 'exempt_channels', description: 'Channels exempt from this rule (comma-separated IDs)', type: 3, required: false },
              { name: 'ignore_bots', description: 'Ignore bot messages (default: true)', type: 5, required: false },
              { name: 'ignore_webhooks', description: 'Ignore webhook messages (default: true)', type: 5, required: false },
            ],
          },
          {
            name: 'remove',
            description: 'Remove a rule',
            type: 1,
            options: [
              { name: 'rule_id', description: 'Rule ID to remove', type: 3, required: true },
            ],
          },
          {
            name: 'edit',
            description: 'Edit a rule',
            type: 1,
            options: [
              { name: 'rule_id', description: 'Rule ID to edit', type: 3, required: true },
              { name: 'name', description: 'New rule name', type: 3, required: false },
              { name: 'enabled', description: 'Enable/disable rule', type: 5, required: false },
              { name: 'trigger', description: 'New trigger content', type: 3, required: false },
              { name: 'action', description: 'New action', type: 3, required: false, choices: [
                { name: 'Block Message', value: 'BLOCK_MESSAGE' },
                { name: 'Timeout', value: 'TIMEOUT' },
                { name: 'Alert', value: 'ALERT' },
                { name: 'Delete', value: 'DELETE' },
              ]},
              { name: 'timeout_duration', description: 'Timeout duration in minutes', type: 4, required: false, min_value: 1, max_value: 40320 },
            ],
          },
          {
            name: 'list',
            description: 'List all rules',
            type: 1,
          },
        ],
      },
      {
        name: 'config',
        description: 'Configure AutoMod settings',
        type: 1,
        options: [
          { name: 'log_channel', description: 'Log channel', type: 7, required: false, channel_types: [0] },
          { name: 'dm_on_action', description: 'DM user on action', type: 5, required: false },
        ],
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const guild = interaction.guild!;

    try {
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
        case 'add':
          await handleRuleAdd(interaction, client);
          break;
        case 'remove':
          await handleRuleRemove(interaction, client);
          break;
        case 'edit':
          await handleRuleEdit(interaction, client);
          break;
        case 'list':
          await handleRuleList(interaction, client);
          break;
      }
    } catch (error) {
      logger.error('Automod command error:', error);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    // Not used for automod
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const logChannel = interaction.options.getChannel('log_channel', true);
  const guild = interaction.guild!;

  if (logChannel.type !== 0) {
    await interaction.reply({ content: 'Log channel must be a text channel.', ephemeral: true });
    return;
  }

  await createAutomodConfig(guild.id, {
    logChannelId: logChannel.id,
    enabled: true,
    dmOnAction: true,
  });

  await interaction.reply({ content: `✅ AutoMod set up with log channel ${logChannel}`, ephemeral: true });
}

async function handleDisable(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  await updateAutomodConfig(guild.id, { enabled: false });
  await interaction.reply({ content: '❌ AutoMod disabled.', ephemeral: true });
}

async function handleConfig(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const logChannel = interaction.options.getChannel('log_channel');
  const dmOnAction = interaction.options.getBoolean('dm_on_action');

  const updates: any = { enabled: true };
  if (logChannel) {
    if (logChannel.type !== 0) {
      await interaction.reply({ content: 'Log channel must be a text channel.', ephemeral: true });
      return;
    }
    updates.logChannelId = logChannel.id;
  }
  if (dmOnAction !== null) updates.dmOnAction = dmOnAction;

  await updateAutomodConfig(guild.id, updates);
  await interaction.reply({ content: '✅ AutoMod config updated.', ephemeral: true });
}

async function handleRuleAdd(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const name = interaction.options.getString('name', true);
  const type = interaction.options.getString('type', true);
  const trigger = interaction.options.getString('trigger', true);
  const action = interaction.options.getString('action', true);
  const timeoutDuration = interaction.options.getInteger('timeout_duration');
  const exemptRolesStr = interaction.options.getString('exempt_roles') || '';
  const exemptChannelsStr = interaction.options.getString('exempt_channels') || '';
  const ignoreBots = interaction.options.getBoolean('ignore_bots') ?? true;
  const ignoreWebhooks = interaction.options.getBoolean('ignore_webhooks') ?? true;
  const guild = interaction.guild!;

  const exemptRoles = exemptRolesStr.split(',').map(id => id.trim()).filter(Boolean);
  const exemptChannels = exemptChannelsStr.split(',').map(id => id.trim()).filter(Boolean);

  const triggers = type === 'REGEX' ? [trigger] : trigger.split(',').map(t => t.trim()).filter(Boolean);
  if (triggers.length === 0) {
    await interaction.reply({ content: 'At least one trigger is required.', ephemeral: true });
    return;
  }

  const rule = await createAutomodRule(guild.id, {
    name,
    type,
    triggers,
    action,
    timeoutDuration: timeoutDuration ?? undefined,
    exemptRoles,
    exemptChannels,
    ignoreBots,
    ignoreWebhooks,
  });

  const embed = successEmbed(
    `**Rule:** ${name}\n` +
    `**Type:** ${type}\n` +
    `**Action:** ${action}\n` +
    `**Triggers:** ${triggers.join(', ')}\n` +
    `**Exempt Roles:** ${exemptRoles.length > 0 ? exemptRoles.map(r => `<@&${r}>`).join(', ') : 'None'}\n` +
    `**Exempt Channels:** ${exemptChannels.length > 0 ? exemptChannels.map(c => `<#${c}>`).join(', ') : 'None'}\n` +
    `**Rule ID:** ${rule.id}`
  ).setTitle(`${EMOJIS.SUCCESS} AutoMod Rule Created`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleRuleRemove(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const ruleId = interaction.options.getString('rule_id', true);
  const guild = interaction.guild!;

  await deleteAutomodRule(ruleId);
  await interaction.reply({ content: '✅ Rule removed.', ephemeral: true });
}

async function handleRuleEdit(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const ruleId = interaction.options.getString('rule_id', true);
  const name = interaction.options.getString('name');
  const enabled = interaction.options.getBoolean('enabled');
  const trigger = interaction.options.getString('trigger');
  const action = interaction.options.getString('action');
  const timeoutDuration = interaction.options.getInteger('timeout_duration');

  const updates: any = {};
  if (name) updates.name = name;
  if (enabled !== null) updates.enabled = enabled;
  if (trigger) updates.triggers = trigger.split(',').map(t => t.trim()).filter(Boolean);
  if (action) updates.action = action;
  if (timeoutDuration !== null) updates.timeoutDuration = timeoutDuration ?? undefined;

  if (Object.keys(updates).length === 0) {
    await interaction.reply({ content: 'No changes specified.', ephemeral: true });
    return;
  }

  await updateAutomodRule(ruleId, updates);
  await interaction.reply({ content: '✅ Rule updated.', ephemeral: true });
}

async function handleRuleList(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const rules = await getAutomodRules(guild.id);

  if (rules.length === 0) {
    await interaction.reply({ content: 'No AutoMod rules configured.', ephemeral: true });
    return;
  }

  const embed = infoEmbed(
    rules.map(r => 
      `**${r.name}** (${r.enabled ? '✅' : '❌'})\n` +
      `Type: ${r.type} | Action: ${r.action}\n` +
      `Triggers: ${r.triggers.slice(0, 3).join(', ')}${r.triggers.length > 3 ? '...' : ''}\n` +
      `ID: ${r.id}\n`
    ).join('\n')
  ).setTitle(`${EMOJIS.SETTINGS} AutoMod Rules`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

export default automodCommand;