import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  EmbedBuilder, 
  VoiceChannel, 
  ChannelType, 
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { voiceEmbed, errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getVoicemasterConfig, createVoicemasterConfig, updateVoicemasterConfig, createTempChannel, getTempChannel, deleteTempChannel, updateTempChannel } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS, CUSTOM_ID_PREFIXES, VM_ACTIONS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const voicemasterCommand: Command = {
  data: {
    name: 'voicemaster',
    description: 'Manage temporary voice channels',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      {
        name: 'setup',
        description: 'Set up Voicemaster',
        type: 1,
        options: [
          { name: 'category', description: 'Category for temporary channels', type: 7, required: true, channel_types: [4] },
          { name: 'create_channel', description: 'Channel to create temp channels from', type: 7, required: true, channel_types: [2] },
        ],
      },
      {
        name: 'disable',
        description: 'Disable Voicemaster',
        type: 1,
      },
      {
        name: 'config',
        description: 'Configure Voicemaster settings',
        type: 1,
        options: [
          { name: 'max_channels', description: 'Max temporary channels per user (0 = unlimited)', type: 4, required: false, min_value: 0 },
          { name: 'default_limit', description: 'Default user limit for new channels (0 = no limit)', type: 4, required: false, min_value: 0, max_value: 99 },
          { name: 'default_name', description: 'Default channel name template ({user} = username)', type: 3, required: false },
          { name: 'bitrate', description: 'Default bitrate in kbps', type: 4, required: false, min_value: 8, max_value: 384 },
        ],
      },
      {
        name: 'panel',
        description: 'Create a Voicemaster control panel',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel to send panel in', type: 7, required: true, channel_types: [0] },
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
      case 'panel':
        await handlePanel(interaction, client);
        break;
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    const guild = interaction.guild!;
    const user = interaction.user;

    if (!data) return;

    const channelId = data;
    const channel = guild.channels.cache.get(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      return;
    }

    const voiceChannel = channel as VoiceChannel;
    const member = voiceChannel.members.get(user.id);

    if (!member) {
      await interaction.reply({ content: 'You are not in this voice channel.', ephemeral: true });
      return;
    }

    const config = await getVoicemasterConfig(guild.id);
    const tempChannel = config?.tempChannels?.find(c => c.channelId === channelId);
    const isOwner = tempChannel?.ownerId === user.id;

    if (!isOwner) {
      await interaction.reply({ content: 'Only the channel owner can use these controls.', ephemeral: true });
      return;
    }

    switch (action) {
      case 'vm_lock':
        await voiceChannel.setUserLimit(voiceChannel.members.size);
        await interaction.reply({ content: '🔒 Channel locked.', ephemeral: true });
        break;
      case 'vm_unlock':
        await voiceChannel.setUserLimit(0);
        await interaction.reply({ content: '🔓 Channel unlocked.', ephemeral: true });
        break;
      case 'vm_ghost':
        await voiceChannel.permissionOverwrites.edit(user.id, { ViewChannel: false, Connect: false });
        await interaction.reply({ content: '👻 Channel hidden from you.', ephemeral: true });
        break;
      case 'vm_reveal':
        await voiceChannel.permissionOverwrites.delete(user.id);
        await interaction.reply({ content: '👁️ Channel revealed to you.', ephemeral: true });
        break;
      case 'vm_claim':
        await updateTempChannel(channelId, { ownerId: user.id });
        await interaction.reply({ content: '👑 Channel ownership claimed.', ephemeral: true });
        break;
      case 'vm_rename':
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId(`${CUSTOM_ID_PREFIXES.VOICEMASTER}rename_${channelId}`)
            .setTitle('Rename Channel')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('new_name')
                  .setLabel('New Channel Name')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Enter new name...')
                  .setRequired(true)
                  .setMaxLength(100)
              )
            )
        );
        break;
      case 'vm_limit':
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId(`${CUSTOM_ID_PREFIXES.VOICEMASTER}limit_${channelId}`)
            .setTitle('Set User Limit')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('limit')
                  .setLabel('User Limit (0 = unlimited, max 99)')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('0')
                  .setRequired(true)
                  .setMaxLength(2)
              )
            )
        );
        break;
      case 'vm_transfer':
        await interaction.showModal(
          new ModalBuilder()
            .setCustomId(`${CUSTOM_ID_PREFIXES.VOICEMASTER}transfer_${channelId}`)
            .setTitle('Transfer Ownership')
            .addComponents(
              new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                  .setCustomId('user_id')
                  .setLabel('User ID to transfer to')
                  .setStyle(TextInputStyle.Short)
                  .setPlaceholder('Right-click user > Copy ID')
                  .setRequired(true)
                  .setMaxLength(20)
              )
            )
        );
        break;
      case 'vm_delete':
        if (voiceChannel.members.size === 1) {
          await voiceChannel.delete('Voicemaster: Owner deleted channel');
          await deleteTempChannel(channelId);
          await interaction.reply({ content: '🗑️ Channel deleted.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Cannot delete channel with other members in it.', ephemeral: true });
        }
        break;
    }
  },

  async handleModal(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    const guild = interaction.guild!;
    const channelId = data;
    const channel = guild.channels.cache.get(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      await interaction.reply({ content: 'Channel not found.', ephemeral: true });
      return;
    }

    const voiceChannel = channel as VoiceChannel;

    if (action === `${CUSTOM_ID_PREFIXES.VOICEMASTER}rename`) {
      const newName = interaction.fields.getTextInputValue('new_name');
      await voiceChannel.setName(newName, `Voicemaster: Renamed by ${interaction.user.tag}`);
      await updateTempChannel(channelId, { name: newName });
      await interaction.reply({ content: `✏️ Channel renamed to "${newName}".`, ephemeral: true });
    } else if (action === `${CUSTOM_ID_PREFIXES.VOICEMASTER}limit`) {
      const limit = parseInt(interaction.fields.getTextInputValue('limit'));
      if (isNaN(limit) || limit < 0 || limit > 99) {
        await interaction.reply({ content: 'Invalid limit. Must be 0-99.', ephemeral: true });
        return;
      }
      await voiceChannel.setUserLimit(limit);
      await interaction.reply({ content: limit === 0 ? '🔓 User limit removed.' : `👥 User limit set to ${limit}.`, ephemeral: true });
    } else if (action === `${CUSTOM_ID_PREFIXES.VOICEMASTER}transfer`) {
      const userId = interaction.fields.getTextInputValue('user_id');
      const targetUser = await client.users.fetch(userId).catch(() => null);
      if (!targetUser) {
        await interaction.reply({ content: 'User not found.', ephemeral: true });
        return;
      }
      const targetMember = guild.members.cache.get(userId);
      if (!targetMember || !voiceChannel.members.has(userId)) {
        await interaction.reply({ content: 'User must be in the voice channel to transfer ownership.', ephemeral: true });
        return;
      }
      await updateTempChannel(channelId, { ownerId: userId });
      await interaction.reply({ content: `👑 Ownership transferred to ${targetUser.tag}.`, ephemeral: true });
    }
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const category = interaction.options.getChannel('category', true);
  const createChannel = interaction.options.getChannel('create_channel', true);
  const guild = interaction.guild!;

  if (category.type !== ChannelType.GuildCategory) {
    await interaction.reply({ content: 'Category must be a category channel.', ephemeral: true });
    return;
  }
  if (createChannel.type !== ChannelType.GuildVoice) {
    await interaction.reply({ content: 'Create channel must be a voice channel.', ephemeral: true });
    return;
  }

  await createVoicemasterConfig(guild.id, {
    categoryId: category.id,
    createChannelId: createChannel.id,
    enabled: true,
  });

  await interaction.reply({ content: '✅ Voicemaster setup complete!', ephemeral: true });
}

async function handleDisable(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  await updateVoicemasterConfig(guild.id, { enabled: false });
  await interaction.reply({ content: '❌ Voicemaster disabled.', ephemeral: true });
}

async function handleConfig(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const maxChannels = interaction.options.getInteger('max_channels');
  const defaultLimit = interaction.options.getInteger('default_limit');
  const defaultName = interaction.options.getString('default_name');
  const bitrate = interaction.options.getInteger('bitrate');

  const updates: any = { enabled: true };
  if (maxChannels !== null) updates.maxChannels = maxChannels;
  if (defaultLimit !== null) updates.defaultLimit = defaultLimit;
  if (defaultName) updates.defaultName = defaultName;
  if (bitrate !== null) updates.bitrate = bitrate;

  await updateVoicemasterConfig(guild.id, updates);
  await interaction.reply({ content: '✅ Voicemaster config updated.', ephemeral: true });
}

async function handlePanel(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  const guild = interaction.guild!;

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: 'Channel must be a text channel.', ephemeral: true });
    return;
  }

  const textChannel = channel as TextChannel;

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  const buttons = [
    { id: VM_ACTIONS.LOCK, label: 'Lock', style: ButtonStyle.Danger, emoji: '🔒' },
    { id: VM_ACTIONS.UNLOCK, label: 'Unlock', style: ButtonStyle.Success, emoji: '🔓' },
    { id: VM_ACTIONS.GHOST, label: 'Ghost', style: ButtonStyle.Secondary, emoji: '👻' },
    { id: VM_ACTIONS.REVEAL, label: 'Reveal', style: ButtonStyle.Primary, emoji: '👁️' },
    { id: VM_ACTIONS.CLAIM, label: 'Claim', style: ButtonStyle.Primary, emoji: '👑' },
    { id: VM_ACTIONS.RENAME, label: 'Rename', style: ButtonStyle.Secondary, emoji: '✏️' },
    { id: VM_ACTIONS.LIMIT, label: 'Limit', style: ButtonStyle.Secondary, emoji: '👥' },
    { id: VM_ACTIONS.TRANSFER, label: 'Transfer', style: ButtonStyle.Primary, emoji: '🤝' },
    { id: VM_ACTIONS.DELETE, label: 'Delete', style: ButtonStyle.Danger, emoji: '🗑️' },
  ];

  for (let i = 0; i < buttons.length; i += 3) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    buttons.slice(i, i + 3).forEach(b => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${b.id}_placeholder`)
          .setLabel(b.label)
          .setStyle(b.style)
          .setEmoji(b.emoji)
          .setDisabled(true)
      );
    });
    rows.push(row);
  }

  const embed = infoEmbed(
    'Use the buttons below to control your temporary voice channel.\n' +
    'You must be the channel owner to use these controls.\n\n' +
    'Join the "Create Channel" to generate your own temporary voice channel.'
  ).setTitle(`${EMOJIS.VOICE} Voicemaster Control Panel`);

  await textChannel.send({ embeds: [embed], components: rows });
  await interaction.reply({ content: '✅ Voicemaster panel created.', ephemeral: true });
}

export default voicemasterCommand;