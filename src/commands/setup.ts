import { 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
} from 'discord.js';
import type { ChatInputCommandInteraction } from 'discord.js';
import type { BotClient } from '@/types/index.js';
import type { Command } from '@/types/index.js';
import { setupEmbed, successEmbed, errorEmbed, warningEmbed } from '@/utils/embeds.js';
import { SETUP_STEPS, SETUP_STEP_COUNT, EMOJIS, CUSTOM_ID_PREFIXES, PERMISSION_LEVELS } from '@/utils/constants.js';
import { getOrCreateGuildConfig, updateGuildConfig, setPermissionRoles, createTicketConfig, createWelcomeConfig, createModConfig, createGameConfig } from '@/utils/database.js';
import { logger } from '@/utils/logger.js';

const setupCommand: Command = {
  data: {
    name: 'setup',
    description: 'Interactive server setup wizard',
    permissionLevel: PERMISSION_LEVELS.OWNER,
    options: [
      {
        name: 'reset',
        description: 'Reset all server configuration',
        type: 1, // SUB_COMMAND
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'reset') {
      await handleReset(interaction, client);
      return;
    }

    await startSetupWizard(interaction, client);
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (action === CUSTOM_ID_PREFIXES.SETUP_STEP) {
      await handleStepButton(interaction, client, data);
    } else if (action === CUSTOM_ID_PREFIXES.SETUP_CONFIRM) {
      await handleConfirm(interaction, client);
    } else if (action === CUSTOM_ID_PREFIXES.SETUP_CANCEL) {
      await handleCancel(interaction, client);
    }
  },

  async handleSelectMenu(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (action === CUSTOM_ID_PREFIXES.SETUP_STEP) {
      await handleStepSelect(interaction, client, data);
    }
  },

  async handleModal(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (action.startsWith(CUSTOM_ID_PREFIXES.SETUP_STEP)) {
      await handleStepModal(interaction, client, action, data);
    }
  },
};

async function startSetupWizard(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const { hasPermission } = await import('@/utils/permissions.js');
  const member = interaction.member as any;
  if (!member) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
    return;
  }
  const permCheck = await hasPermission(member, PERMISSION_LEVELS.OWNER);
  
  if (!permCheck.hasPermission) {
    await interaction.reply({ 
      content: '❌ Only server owners can run the setup wizard.', 
      ephemeral: true 
    });
    return;
  }

  const userId = interaction.user.id;

  const existingState = client.setupStates.get(userId);
  if (existingState) {
    await interaction.reply({ 
      content: '❌ You already have an active setup session. Please complete or cancel it first.', 
      ephemeral: true 
    });
    return;
  }

  const state = {
    step: 0,
    data: {
      basic: {},
      permissions: {},
      tickets: {},
      welcome: {},
      moderation: {},
      games: {},
      utility: {},
    },
    messageId: undefined,
    channelId: interaction.channelId,
  };

  client.setupStates.set(userId, state);

  await showStep(interaction, client, state, 0);
}

async function showStep(interaction: ChatInputCommandInteraction | any, client: BotClient, state: any, stepIndex: number): Promise<void> {
  state.step = stepIndex;
  const step = SETUP_STEPS[stepIndex];

  const embed = setupEmbed(stepIndex + 1, SETUP_STEP_COUNT, step.name, step.description);
  
  const components = createStepComponents(stepIndex, state);

  if (interaction.isChatInputCommand() || interaction.isButton()) {
    await interaction.update({ embeds: [embed], components });
  } else {
    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  }

  const message = await interaction.fetchReply();
  state.messageId = message.id;
  state.channelId = interaction.channelId;
}

function createStepComponents(stepIndex: number, _state: any): ActionRowBuilder<any>[] {
  const components: ActionRowBuilder<any>[] = [];

  if (stepIndex > 0) {
    const backButton = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}back_${stepIndex - 1}`)
      .setLabel('Back')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(EMOJIS.ARROW_LEFT);
    components.push(new ActionRowBuilder().addComponents(backButton));
  }

  if (stepIndex < SETUP_STEP_COUNT - 1) {
    const nextButton = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}next_${stepIndex + 1}`)
      .setLabel('Next')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(EMOJIS.ARROW_RIGHT);
    components.push(new ActionRowBuilder().addComponents(nextButton));
  } else {
    const confirmButton = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_CONFIRM}`)
      .setLabel('Confirm & Apply')
      .setStyle(ButtonStyle.Success)
      .setEmoji(EMOJIS.CHECK);
    const cancelButton = new ButtonBuilder()
      .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_CANCEL}`)
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(EMOJIS.CROSS);
    components.push(new ActionRowBuilder().addComponents(confirmButton, cancelButton));
  }

  return components;
}

async function handleStepButton(interaction: any, client: BotClient, data: string): Promise<void> {
  const userId = interaction.user.id;
  const state = client.setupStates.get(userId);
  if (!state) return;

  const [action, stepStr] = data.split('_');
  const stepIndex = parseInt(stepStr, 10);

  if (action === 'back' || action === 'next') {
    if (!await validateStep(state, interaction)) {
      return;
    }
    await showStep(interaction, client, state, stepIndex);
  }
}

async function handleStepSelect(interaction: any, client: BotClient, data: string): Promise<void> {
  const userId = interaction.user.id;
  const state = client.setupStates.get(userId);
  if (!state) return;

  const step = SETUP_STEPS[state.step];
  
  if (step.id === 'permissions') {
    const values = interaction.values;
    const roleType = data;
    state.data.permissions[roleType] = values;
    await interaction.reply({ content: `✅ ${roleType} roles updated`, ephemeral: true });
  }
}

async function handleStepModal(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
  const userId = interaction.user.id;
  const state = client.setupStates.get(userId);
  if (!state) return;

  const step = SETUP_STEPS[state.step];

  if (step.id === 'basic') {
    state.data.basic.prefix = interaction.fields.getTextInputValue('prefix') || '!';
    state.data.basic.language = interaction.fields.getTextInputValue('language') || 'en';
    state.data.basic.logChannelId = interaction.fields.getTextInputValue('logChannelId') || undefined;
    state.data.basic.modLogChannelId = interaction.fields.getTextInputValue('modLogChannelId') || undefined;
  } else if (step.id === 'tickets') {
    state.data.tickets.enabled = true;
    state.data.tickets.categoryId = interaction.fields.getTextInputValue('categoryId') || undefined;
    state.data.tickets.supportRoleId = interaction.fields.getTextInputValue('supportRoleId') || undefined;
    state.data.tickets.logChannelId = interaction.fields.getTextInputValue('logChannelId') || undefined;
    state.data.tickets.transcriptChannelId = interaction.fields.getTextInputValue('transcriptChannelId') || undefined;
    state.data.tickets.panelTitle = interaction.fields.getTextInputValue('panelTitle') || 'Support Tickets';
    state.data.tickets.panelDescription = interaction.fields.getTextInputValue('panelDescription') || 'Click the button below to create a ticket';
    state.data.tickets.panelEmoji = interaction.fields.getTextInputValue('panelEmoji') || '🎫';
  } else if (step.id === 'welcome') {
    state.data.welcome.enabled = true;
    state.data.welcome.channelId = interaction.fields.getTextInputValue('channelId') || undefined;
    state.data.welcome.message = interaction.fields.getTextInputValue('message') || 'Welcome {user} to {server}!';
    state.data.welcome.roleId = interaction.fields.getTextInputValue('roleId') || undefined;
    state.data.welcome.dmMessage = interaction.fields.getTextInputValue('dmMessage') || undefined;
    state.data.welcome.leaveChannelId = interaction.fields.getTextInputValue('leaveChannelId') || undefined;
    state.data.welcome.leaveMessage = interaction.fields.getTextInputValue('leaveMessage') || 'Goodbye {user}!';
    state.data.welcome.inviteTracking = interaction.fields.getTextInputValue('inviteTracking') === 'true';
    state.data.welcome.fakeUserCheck = interaction.fields.getTextInputValue('fakeUserCheck') === 'true';
  } else if (step.id === 'moderation') {
    state.data.moderation.enabled = true;
    state.data.moderation.logChannelId = interaction.fields.getTextInputValue('logChannelId') || undefined;
    state.data.moderation.dmOnAction = interaction.fields.getTextInputValue('dmOnAction') === 'true';
    state.data.moderation.muteRoleId = interaction.fields.getTextInputValue('muteRoleId') || undefined;
  } else if (step.id === 'games') {
    state.data.games.economyEnabled = interaction.fields.getTextInputValue('economyEnabled') === 'true';
    state.data.games.startingBalance = parseInt(interaction.fields.getTextInputValue('startingBalance') || '1000', 10);
  } else if (step.id === 'utility') {
    state.data.utility.snipeEnabled = interaction.fields.getTextInputValue('snipeEnabled') === 'true';
    state.data.utility.quoteEnabled = interaction.fields.getTextInputValue('quoteEnabled') === 'true';
  }

  await interaction.reply({ content: '✅ Settings saved', ephemeral: true });
}

async function validateStep(state: any, interaction: any): Promise<boolean> {
  const step = SETUP_STEPS[state.step];

  if (step.id === 'basic') {
    const prefix = interaction.fields?.getTextInputValue('prefix') || state.data.basic.prefix;
    if (prefix && prefix.length > 5) {
      await interaction.reply({ content: '❌ Prefix must be 5 characters or less', ephemeral: true });
      return false;
    }
  }

  return true;
}

async function handleConfirm(interaction: any, client: BotClient): Promise<void> {
  const userId = interaction.user.id;
  const state = client.setupStates.get(userId);
  if (!state) return;

  await interaction.deferUpdate();

  try {
    const guildId = interaction.guildId!;
    
    await applySetup(guildId, state.data);

    const embed = successEmbed('Server setup completed successfully! All settings have been applied.', '✅ Setup Complete');
    embed.addFields(
      { name: 'Prefix', value: state.data.basic.prefix || '!', inline: true },
      { name: 'Language', value: state.data.basic.language || 'en', inline: true },
      { name: 'Tickets', value: state.data.tickets.enabled ? 'Enabled' : 'Disabled', inline: true },
      { name: 'Welcome', value: state.data.welcome.enabled ? 'Enabled' : 'Disabled', inline: true },
      { name: 'Moderation', value: state.data.moderation.enabled ? 'Enabled' : 'Disabled', inline: true },
      { name: 'Economy', value: state.data.games.economyEnabled ? 'Enabled' : 'Disabled', inline: true },
    );

    await interaction.editReply({ embeds: [embed], components: [] });
  } catch (error) {
    logger.error('Setup confirmation error:', error);
    await interaction.editReply({ 
      embeds: [errorEmbed('Failed to apply setup. Please check bot permissions and try again.')], 
      components: [] 
    });
  }

  client.setupStates.delete(userId);
}

async function handleCancel(interaction: any, client: BotClient): Promise<void> {
  const userId = interaction.user.id;
  client.setupStates.delete(userId);

  const embed = warningEmbed('Setup wizard cancelled. No changes were made.', '⚠️ Cancelled');
  await interaction.update({ embeds: [embed], components: [] });
}

async function applySetup(guildId: string, data: any): Promise<void> {
  const guildConfig = await getOrCreateGuildConfig(guildId);

  await updateGuildConfig(guildId, {
    prefix: data.basic.prefix || '!',
    language: data.basic.language || 'en',
    logChannelId: data.basic.logChannelId,
    modLogChannelId: data.basic.modLogChannelId || data.basic.logChannelId,
  });

  if (Object.keys(data.permissions).length > 0) {
    const roles: { roleId: string; level: 1 | 2 | 3 }[] = [];
    if (data.permissions.moderator) {
      for (const roleId of data.permissions.moderator) roles.push({ roleId, level: PERMISSION_LEVELS.MODERATOR });
    }
    if (data.permissions.admin) {
      for (const roleId of data.permissions.admin) roles.push({ roleId, level: PERMISSION_LEVELS.ADMIN });
    }
    if (data.permissions.owner) {
      for (const roleId of data.permissions.owner) roles.push({ roleId, level: PERMISSION_LEVELS.OWNER });
    }
    await setPermissionRoles(guildId, roles);
  }

  if (data.tickets.enabled) {
    await createTicketConfig(guildId, {
      categoryId: data.tickets.categoryId,
      logChannelId: data.tickets.logChannelId,
      supportRoleId: data.tickets.supportRoleId,
      transcriptChannelId: data.tickets.transcriptChannelId,
    });
  }

  if (data.welcome.enabled) {
    await createWelcomeConfig(guildId, {
      enabled: true,
      channelId: data.welcome.channelId,
      dmEnabled: !!data.welcome.dmMessage,
      dmMessage: data.welcome.dmMessage,
      roleId: data.welcome.roleId,
      leaveChannelId: data.welcome.leaveChannelId,
      leaveMessage: data.welcome.leaveMessage,
      inviteTracking: data.welcome.inviteTracking,
      fakeUserCheck: data.welcome.fakeUserCheck,
    });
  }

  if (data.moderation.enabled) {
    await createModConfig(guildId, {
      logChannelId: data.moderation.logChannelId,
      dmOnAction: data.moderation.dmOnAction,
      muteRoleId: data.moderation.muteRoleId,
    });
  }

  if (data.games.economyEnabled) {
    await createGameConfig(guildId, {
      economyEnabled: true,
    });
  }
}

async function handleReset(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const { hasPermission } = await import('@/utils/permissions.js');
  const member = interaction.member as any;
  if (!member) {
    await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
    return;
  }
  const permCheck = await hasPermission(member, PERMISSION_LEVELS.OWNER);
  
  if (!permCheck.hasPermission) {
    await interaction.reply({ content: '❌ Only server owners can reset configuration.', ephemeral: true });
    return;
  }

  const guildId = interaction.guildId!;
  
  await interaction.reply({ content: '⚠️ Resetting all configuration... This cannot be undone!', ephemeral: true });
  
  try {
    const { prisma } = await import('@/database/client.js');
    await prisma.$transaction(async (tx) => {
      await tx.guildConfig.delete({ where: { guildId } }).catch(() => {});
      await tx.ticketConfig.delete({ where: { guildId } }).catch(() => {});
      await tx.welcomeConfig.delete({ where: { guildId } }).catch(() => {});
      await tx.modConfig.delete({ where: { guildId } }).catch(() => {});
      await tx.gameConfig.delete({ where: { guildId } }).catch(() => {});
      await tx.permissionRole.deleteMany({ where: { guildId } });
    });

    await interaction.editReply({ content: '✅ All configuration has been reset.' });
  } catch (error) {
    logger.error('Setup reset error:', error);
    await interaction.editReply({ content: '❌ Failed to reset configuration.' });
  }
}

export default setupCommand;