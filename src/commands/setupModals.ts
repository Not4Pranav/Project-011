import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import { SETUP_STEPS, CUSTOM_ID_PREFIXES, EMOJIS } from '@/utils/constants.js';

export function createBasicModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_basic`)
    .setTitle('Basic Configuration')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('prefix')
          .setLabel('Bot Prefix')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('!')
          .setValue('!')
          .setMaxLength(5)
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('language')
          .setLabel('Language Code')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('en')
          .setValue('en')
          .setMaxLength(5)
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('logChannelId')
          .setLabel('General Log Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for general logs')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('modLogChannelId')
          .setLabel('Moderation Log Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for mod logs (optional)')
          .setRequired(false)
      )
    );
}

export function createPermissionsSelect(): StringSelectMenuBuilder {
  return new StringSelectMenuBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}select_permissions_moderator`)
    .setPlaceholder('Select moderator roles')
    .setMinValues(0)
    .setMaxValues(10)
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel('Load roles...')
        .setValue('loading')
        .setDescription('Click to load available roles')
    );
}

export function createPermissionsModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_permissions`)
    .setTitle('Permission Roles')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('moderatorRoles')
          .setLabel('Moderator Role IDs (comma-separated)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('123456789,987654321')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('adminRoles')
          .setLabel('Admin Role IDs (comma-separated)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('123456789,987654321')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('ownerRoles')
          .setLabel('Owner Role IDs (comma-separated)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('123456789,987654321')
          .setRequired(false)
      )
    );
}

export function createTicketsModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_tickets`)
    .setTitle('Ticket System Configuration')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('categoryId')
          .setLabel('Ticket Category ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Category ID for ticket channels')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('supportRoleId')
          .setLabel('Support Role ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Role ID that can view/manage tickets')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('logChannelId')
          .setLabel('Ticket Log Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for ticket logs')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('transcriptChannelId')
          .setLabel('Transcript Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for ticket transcripts')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('panelTitle')
          .setLabel('Panel Title')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Support Tickets')
          .setValue('Support Tickets')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('panelDescription')
          .setLabel('Panel Description')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Click the button below to create a ticket')
          .setValue('Click the button below to create a ticket')
          .setRequired(false)
      )
    );
}

export function createWelcomeModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_welcome`)
    .setTitle('Welcome System Configuration')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('channelId')
          .setLabel('Welcome Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for welcome messages')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel('Welcome Message')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Welcome {user} to {server}! 🎉')
          .setValue('Welcome {user} to {server}! 🎉')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('roleId')
          .setLabel('Auto-Role ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Role ID to assign on join')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('dmMessage')
          .setLabel('DM Welcome Message (optional)')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Welcome to {server}! Check out our rules...')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('leaveChannelId')
          .setLabel('Leave Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for leave messages')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('leaveMessage')
          .setLabel('Leave Message')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Goodbye {user}! We\'ll miss you.')
          .setValue('Goodbye {user}! We\'ll miss you.')
          .setRequired(false)
      )
    );
}

export function createWelcomeTogglesModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_welcome_toggles`)
    .setTitle('Welcome Toggles')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('inviteTracking')
          .setLabel('Enable Invite Tracking (true/false)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('true')
          .setValue('true')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('fakeUserCheck')
          .setLabel('Enable Fake User Check (true/false)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('true')
          .setValue('true')
          .setRequired(false)
      )
    );
}

export function createModerationModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_moderation`)
    .setTitle('Moderation Configuration')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('logChannelId')
          .setLabel('Mod Log Channel ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Channel ID for moderation logs')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('dmOnAction')
          .setLabel('DM User on Action (true/false)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('true')
          .setValue('true')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('muteRoleId')
          .setLabel('Mute Role ID (optional)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Role ID for mute (will be created if not provided)')
          .setRequired(false)
      )
    );
}

export function createGamesModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_games`)
    .setTitle('Games & Economy Configuration')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('economyEnabled')
          .setLabel('Enable Economy (true/false)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('true')
          .setValue('true')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('startingBalance')
          .setLabel('Starting Balance')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('1000')
          .setValue('1000')
          .setRequired(false)
      )
    );
}

export function createUtilityModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.SETUP_STEP}modal_utility`)
    .setTitle('Utility Features')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('snipeEnabled')
          .setLabel('Enable Message Snipe (true/false)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('true')
          .setValue('true')
          .setRequired(false)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('quoteEnabled')
          .setLabel('Enable Quote System (true/false)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('true')
          .setValue('true')
          .setRequired(false)
      )
    );
}