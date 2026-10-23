import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder,
  TextChannel,
  Role,
  ChannelType,
} from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { welcomeEmbed, errorEmbed, successEmbed, infoEmbed, welcomeEmbedCustom } from '../../utils/embeds.js';
import { getWelcomeConfig, createWelcomeConfig, updateWelcomeConfig, setWelcomeMessages, getGuildConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, WELCOME_TYPES } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const welcomeCommand: Command = {
  data: {
    name: 'welcome',
    description: 'Configure welcome system',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
    cooldown: 5000,
    options: [
      {
        name: 'configure',
        description: 'Interactive welcome configuration',
        type: 1,
      },
      {
        name: 'test',
        description: 'Test welcome message',
        type: 1,
      },
      {
        name: 'toggle',
        description: 'Enable/disable welcome system',
        type: 1,
        options: [
          { name: 'enabled', description: 'Enable or disable', type: 5, required: true },
        ],
      },
      {
        name: 'setmessage',
        description: 'Set welcome/leave/DM message',
        type: 1,
        options: [
          { name: 'type', description: 'Message type', type: 3, required: true, choices: [
            { name: 'Welcome', value: 'WELCOME' },
            { name: 'Leave', value: 'LEAVE' },
            { name: 'DM', value: 'DM' },
          ]},
          { name: 'content', description: 'Message content (use {user}, {server})', type: 3, required: true },
        ],
      },
      {
        name: 'setchannel',
        description: 'Set welcome/leave channel',
        type: 1,
        options: [
          { name: 'type', description: 'Channel type', type: 3, required: true, choices: [
            { name: 'Welcome', value: 'WELCOME' },
            { name: 'Leave', value: 'LEAVE' },
          ]},
          { name: 'channel', description: 'Channel to use', type: 7, required: true, channel_types: [0] },
        ],
      },
      {
        name: 'setrole',
        description: 'Set auto-role for new members',
        type: 1,
        options: [
          { name: 'role', description: 'Role to assign', type: 8, required: true },
        ],
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    switch (subcommand) {
      case 'configure':
        await handleConfigure(interaction, client);
        break;
      case 'test':
        await handleTest(interaction, client);
        break;
      case 'toggle':
        await handleToggle(interaction, client);
        break;
      case 'setmessage':
        await handleSetMessage(interaction, client);
        break;
      case 'setchannel':
        await handleSetChannel(interaction, client);
        break;
      case 'setrole':
        await handleSetRole(interaction, client);
        break;
    }
  },
};

async function handleConfigure(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  let config = await getWelcomeConfig(guild.id) as any;

  if (!config) {
    config = await createWelcomeConfig(guild.id, {
      enabled: true,
      channelId: undefined,
      dmEnabled: false,
      dmMessage: undefined,
      roleId: undefined,
      leaveChannelId: undefined,
      leaveMessage: 'Goodbye {user}!',
      inviteTracking: true,
      fakeUserCheck: true,
    });
  }

  const embed = infoEmbed(
    `**Welcome System Configuration**\n\n` +
    `**Status:** ${config.enabled ? 'Enabled' : 'Disabled'}\n` +
    `**Welcome Channel:** ${config.channelId ? `<#${config.channelId}>` : 'Not set'}\n` +
    `**Leave Channel:** ${config.leaveChannelId ? `<#${config.leaveChannelId}>` : 'Not set'}\n` +
    `**Auto-Role:** ${config.roleId ? `<@&${config.roleId}>` : 'Not set'}\n` +
    `**DM Welcome:** ${config.dmEnabled ? 'Enabled' : 'Disabled'}\n` +
    `**Invite Tracking:** ${config.inviteTracking ? 'Enabled' : 'Disabled'}\n` +
    `**Fake User Check:** ${config.fakeUserCheck ? 'Enabled' : 'Disabled'}\n\n` +
    `Use the subcommands to modify settings.`
  ).setTitle(`${EMOJIS.SETTINGS} Welcome Configuration`);

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleTest(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const config = await getWelcomeConfig(guild.id) as any;

  if (!config || !config.enabled) {
    await interaction.reply({ embeds: [errorEmbed('Welcome system is not configured or disabled.')], ephemeral: true });
    return;
  }

  if (!config.channelId) {
    await interaction.reply({ embeds: [errorEmbed('Welcome channel not set.')], ephemeral: true });
    return;
  }

  const channel = guild.channels.cache.get(config.channelId) as TextChannel;
  if (!channel) {
    await interaction.reply({ embeds: [errorEmbed('Welcome channel not found.')], ephemeral: true });
    return;
  }

  const welcomeMessages = await (await import('../../utils/database.js')).getWelcomeMessages(config.id);
  const welcomeMsg = welcomeMessages.find(m => m.type === WELCOME_TYPES.WELCOME);
  
  const content = welcomeMsg?.content || 'Welcome {user} to {server}! 🎉';
  const embedData = welcomeMsg?.embedData as Record<string, any> | undefined;

  const embed = welcomeEmbedCustom(interaction.member as any, content, embedData);
  await channel.send({ embeds: [embed] });

  if (config.dmEnabled && config.dmMessage) {
    try {
      const dmEmbed = welcomeEmbedCustom(interaction.member as any, config.dmMessage, embedData);
      await interaction.user.send({ embeds: [dmEmbed] });
    } catch {
      // Ignore DM failures
    }
  }

  await interaction.reply({ embeds: [successEmbed('Test welcome message sent!')], ephemeral: true });
}

async function handleToggle(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const enabled = interaction.options.getBoolean('enabled', true);

  let config = await getWelcomeConfig(guild.id) as any;
  if (!config) {
    config = await createWelcomeConfig(guild.id, {
      enabled,
      channelId: undefined,
      dmEnabled: false,
      dmMessage: undefined,
      roleId: undefined,
      leaveChannelId: undefined,
      leaveMessage: 'Goodbye {user}!',
      inviteTracking: true,
      fakeUserCheck: true,
    });
  } else {
    await updateWelcomeConfig(guild.id, { enabled });
  }

  await interaction.reply({ embeds: [successEmbed(`Welcome system ${enabled ? 'enabled' : 'disabled'}.`)] });
}

async function handleSetMessage(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const type = interaction.options.getString('type', true) as 'WELCOME' | 'LEAVE' | 'DM';
  const content = interaction.options.getString('content', true);

  let config = await getWelcomeConfig(guild.id) as any;
  if (!config) {
    config = await createWelcomeConfig(guild.id, {
      enabled: true,
      channelId: undefined,
      dmEnabled: false,
      dmMessage: undefined,
      roleId: undefined,
      leaveChannelId: undefined,
      leaveMessage: 'Goodbye {user}!',
      inviteTracking: true,
      fakeUserCheck: true,
    });
  }

  const welcomeMessages = await (await import('../../utils/database.js')).getWelcomeMessages(config.id);
  const existing = welcomeMessages.find(m => m.type === type);
  
  const messages = welcomeMessages.filter(m => m.type !== type);
  messages.push({ type, content, embedData: existing?.embedData } as any);

  await setWelcomeMessages(config.id, messages);
  await interaction.reply({ embeds: [successEmbed(`${type} message updated.`)] });
}

async function handleSetChannel(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const type = interaction.options.getString('type', true) as 'WELCOME' | 'LEAVE';
  const channel = interaction.options.getChannel('channel', true);

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ embeds: [errorEmbed('Invalid channel type.')], ephemeral: true });
    return;
  }

  const textChannel = channel as TextChannel;

  let config = await getWelcomeConfig(guild.id) as any;
  if (!config) {
    config = await createWelcomeConfig(guild.id, {
      enabled: true,
      channelId: type === 'WELCOME' ? channel.id : undefined,
      dmEnabled: false,
      dmMessage: undefined,
      roleId: undefined,
      leaveChannelId: type === 'LEAVE' ? channel.id : undefined,
      leaveMessage: 'Goodbye {user}!',
      inviteTracking: true,
      fakeUserCheck: true,
    });
  } else {
    await updateWelcomeConfig(guild.id, {
      [type === 'WELCOME' ? 'channelId' : 'leaveChannelId']: channel.id,
    });
  }

  await interaction.reply({ embeds: [successEmbed(`${type} channel set to ${channel}.`)] });
}

async function handleSetRole(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const role = interaction.options.getRole('role', true);

  let config = await getWelcomeConfig(guild.id) as any;
  if (!config) {
    config = await createWelcomeConfig(guild.id, {
      enabled: true,
      channelId: undefined,
      dmEnabled: false,
      dmMessage: undefined,
      roleId: role.id,
      leaveChannelId: undefined,
      leaveMessage: 'Goodbye {user}!',
      inviteTracking: true,
      fakeUserCheck: true,
    });
  } else {
    await updateWelcomeConfig(guild.id, { roleId: role.id });
  }

  await interaction.reply({ embeds: [successEmbed(`Auto-role set to ${role}.`)] });
}

export default welcomeCommand;