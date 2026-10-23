import { 
  SlashCommandBuilder, 
  ChatInputCommandInteraction, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder,
  EmbedBuilder,
  ChannelType,
  PermissionFlagsBits,
  PermissionOverwrites,
  GuildMember,
  TextChannel,
  CategoryChannel,
} from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { ticketEmbed, errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getTicketConfig, createTicketConfig, createTicketPanel, createTicket, getTicketByChannel, updateTicket, addTicketMessage, getTicketMessages, getTicketPanels } from '../../utils/database.js';
import { PERMISSION_LEVELS, TICKET_STATUS, CUSTOM_ID_PREFIXES, EMOJIS, COLORS, LIMITS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';
import { hasPermission } from '../../utils/permissions.js';

const ticketCommand: Command = {
  data: {
    name: 'ticket',
    description: 'Manage ticket system',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      {
        name: 'panel',
        description: 'Create a ticket panel',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel to send panel in', type: 7, required: true, channel_types: [0] },
          { name: 'title', description: 'Panel title', type: 3, required: true },
          { name: 'description', description: 'Panel description', type: 3, required: true },
          { name: 'emoji', description: 'Button emoji', type: 3, required: false },
          { name: 'category', description: 'Category for tickets', type: 7, required: false, channel_types: [4] },
        ],
      },
      {
        name: 'close',
        description: 'Close current ticket',
        type: 1,
        options: [
          { name: 'reason', description: 'Reason for closing', type: 3, required: false },
        ],
      },
      {
        name: 'claim',
        description: 'Claim current ticket',
        type: 1,
      },
      {
        name: 'add',
        description: 'Add user to ticket',
        type: 1,
        options: [
          { name: 'user', description: 'User to add', type: 6, required: true },
        ],
      },
      {
        name: 'remove',
        description: 'Remove user from ticket',
        type: 1,
        options: [
          { name: 'user', description: 'User to remove', type: 6, required: true },
        ],
      },
      {
        name: 'transcript',
        description: 'Generate ticket transcript',
        type: 1,
      },
      {
        name: 'reopen',
        description: 'Reopen closed ticket',
        type: 1,
      },
      {
        name: 'delete',
        description: 'Delete ticket channel',
        type: 1,
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;
    const member = interaction.member as GuildMember;

    const ticketConfig = await getTicketConfig(guild.id);
    if (!ticketConfig && subcommand !== 'panel') {
      await interaction.reply({ embeds: [errorEmbed('Ticket system not configured. Run /setup first.')], ephemeral: true });
      return;
    }

    switch (subcommand) {
      case 'panel':
        await handleCreatePanel(interaction, client, ticketConfig);
        break;
      case 'close':
        await handleClose(interaction, client, ticketConfig);
        break;
      case 'claim':
        await handleClaim(interaction, client, ticketConfig);
        break;
      case 'add':
        await handleAdd(interaction, client, ticketConfig);
        break;
      case 'remove':
        await handleRemove(interaction, client, ticketConfig);
        break;
      case 'transcript':
        await handleTranscript(interaction, client, ticketConfig);
        break;
      case 'reopen':
        await handleReopen(interaction, client, ticketConfig);
        break;
      case 'delete':
        await handleDelete(interaction, client, ticketConfig);
        break;
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    const guild = interaction.guild!;
    const ticketConfig = await getTicketConfig(guild.id);
    
    if (!ticketConfig) return;

    switch (action) {
      case 'ticket_create':
        await handleCreateTicket(interaction, client, ticketConfig, data);
        break;
      case 'ticket_close':
        await handleCloseTicket(interaction, client, ticketConfig, data);
        break;
      case 'ticket_claim':
        await handleClaimTicket(interaction, client, ticketConfig, data);
        break;
      case 'ticket_add':
        await handleAddUser(interaction, client, ticketConfig, data);
        break;
      case 'ticket_remove':
        await handleRemoveUser(interaction, client, ticketConfig, data);
        break;
      case 'ticket_transcript':
        await handleTranscriptTicket(interaction, client, ticketConfig, data);
        break;
      case 'ticket_reopen':
        await handleReopenTicket(interaction, client, ticketConfig, data);
        break;
      case 'ticket_delete':
        await handleDeleteTicket(interaction, client, ticketConfig, data);
        break;
    }
  },
};

async function handleCreatePanel(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const emoji = interaction.options.getString('emoji') || '🎫';
  const category = interaction.options.getChannel('category') as CategoryChannel | null;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({ embeds: [errorEmbed('Invalid channel type.')], ephemeral: true });
    return;
  }

  const textChannel = channel as TextChannel;
  const panels = await getTicketPanels(ticketConfig.id);
  if (panels.length >= LIMITS.MAX_TICKET_PANELS) {
    await interaction.reply({ embeds: [errorEmbed(`Maximum ${LIMITS.MAX_TICKET_PANELS} panels allowed.`)], ephemeral: true });
    return;
  }

  const button = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_CREATE}${ticketConfig.id}`)
    .setLabel('Create Ticket')
    .setStyle(ButtonStyle.Primary)
    .setEmoji(emoji);

  const embed = ticketEmbed(description).setTitle(`${emoji} ${title}`);
  
  await textChannel.send({ embeds: [embed], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(button)] });

  const panel = await createTicketPanel(ticketConfig.id, {
    channelId: textChannel.id,
    messageId: (await textChannel.messages.fetch({ limit: 1 })).first()!.id,
    title,
    description,
    emoji,
    categoryId: category?.id,
  });

  await interaction.reply({ embeds: [successEmbed(`Ticket panel created in ${textChannel}`)], ephemeral: true });
}

async function handleCreateTicket(interaction: any, client: BotClient, ticketConfig: any, panelId: string): Promise<void> {
  const user = interaction.user;
  const guild = interaction.guild!;

  const existingTicket = await getTicketByChannel(interaction.channelId);
  if (existingTicket) {
    await interaction.reply({ embeds: [errorEmbed('This channel is already a ticket.')], ephemeral: true });
    return;
  }

  const panels = await getTicketPanels(ticketConfig.id);
  const panel = panels.find(p => p.id === panelId);
  const category = panel?.categoryId ? guild.channels.cache.get(panel.categoryId) as CategoryChannel | null : 
    ticketConfig.categoryId ? guild.channels.cache.get(ticketConfig.categoryId) as CategoryChannel | null : null;

  const overwrites = [
    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
  ];

  if (ticketConfig.supportRoleId) {
    overwrites.push({ id: ticketConfig.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }

  const ticketChannel = await guild.channels.create({
    name: `ticket-${user.username}-${Date.now().toString().slice(-4)}`,
    type: ChannelType.GuildText,
    parent: category?.id,
    permissionOverwrites: overwrites,
    topic: `Ticket for ${user.tag} (${user.id})`,
  });

  const ticket = await createTicket(ticketConfig.id, ticketChannel.id, user.id);

  const closeButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_CLOSE}${ticket.id}`)
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(EMOJIS.CLOSE);
  const claimButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_CLAIM}${ticket.id}`)
    .setLabel('Claim')
    .setStyle(ButtonStyle.Success)
    .setEmoji(EMOJIS.CLAIM);
  const transcriptButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_TRANSCRIPT}${ticket.id}`)
    .setLabel('Transcript')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(EMOJIS.TRANSCRIPT);

  const embed = ticketEmbed(`Welcome ${user}! Support will be with you shortly.\n\n**Ticket ID:** ${ticket.id}`)
    .setTitle(`${EMOJIS.TICKET} Ticket Created`);

  await ticketChannel.send({ 
    content: `${user}${ticketConfig.supportRoleId ? ` <@&${ticketConfig.supportRoleId}>` : ''}`,
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(closeButton, claimButton, transcriptButton)]
  });

  await interaction.reply({ content: `Ticket created: ${ticketChannel}`, ephemeral: true });
}

async function handleClose(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  await handleCloseTicket(interaction, client, ticketConfig, (await getTicketByChannel(interaction.channelId))?.id || '');
}

async function handleCloseTicket(interaction: any, client: BotClient, ticketConfig: any, ticketId: string): Promise<void> {
  const ticket = ticketId ? await (await import('../../utils/database.js')).getTicketById(ticketId) : await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  if (ticket.status === TICKET_STATUS.CLOSED || ticket.status === TICKET_STATUS.DELETED) {
    await interaction.reply({ embeds: [errorEmbed('Ticket is already closed.')], ephemeral: true });
    return;
  }

  const reason = interaction.isChatInputCommand() ? interaction.options.getString('reason') || 'No reason provided' : 'Closed via button';
  const member = interaction.member as GuildMember;

  await updateTicket(ticket.id, { status: TICKET_STATUS.CLOSED, closedAt: new Date() });

  const reopenButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_REOPEN}${ticket.id}`)
    .setLabel('Reopen')
    .setStyle(ButtonStyle.Success)
    .setEmoji(EMOJIS.REOPEN);
  const deleteButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_DELETE}${ticket.id}`)
    .setLabel('Delete')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(EMOJIS.DELETE);
  const transcriptButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_TRANSCRIPT}${ticket.id}`)
    .setLabel('Transcript')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(EMOJIS.TRANSCRIPT);

  const embed = ticketEmbed(`Ticket closed by ${member.user.tag}\n**Reason:** ${reason}`)
    .setTitle(`${EMOJIS.CLOSE} Ticket Closed`);

  await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(reopenButton, deleteButton, transcriptButton)] });

  if (ticketConfig.logChannelId) {
    const logChannel = interaction.guild!.channels.cache.get(ticketConfig.logChannelId);
    if (logChannel && logChannel.type === ChannelType.GuildText) {
      await logChannel.send({ embeds: [embed] });
    }
  }
}

async function handleClaim(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  await handleClaimTicket(interaction, client, ticketConfig, (await getTicketByChannel(interaction.channelId))?.id || '');
}

async function handleClaimTicket(interaction: any, client: BotClient, ticketConfig: any, ticketId: string): Promise<void> {
  const ticket = ticketId ? await (await import('../../utils/database.js')).getTicketById(ticketId) : await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  if (ticket.status !== TICKET_STATUS.OPEN) {
    await interaction.reply({ embeds: [errorEmbed('Ticket is not open.')], ephemeral: true });
    return;
  }

  const member = interaction.member as GuildMember;
  await updateTicket(ticket.id, { status: TICKET_STATUS.CLAIMED, claimedBy: member.id });

  const embed = ticketEmbed(`Ticket claimed by ${member.user.tag}`)
    .setTitle(`${EMOJIS.CLAIM} Ticket Claimed`);

  await interaction.update({ embeds: [embed] });
}

async function handleAdd(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  const user = interaction.options.getUser('user', true);
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  const channel = interaction.channel as TextChannel;
  await channel.permissionOverwrites.edit(user.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await interaction.reply({ embeds: [successEmbed(`Added ${user.tag} to this ticket.`)] });
}

async function handleAddUser(interaction: any, client: BotClient, ticketConfig: any, data: string): Promise<void> {
  // Not used for buttons
}

async function handleRemove(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  const user = interaction.options.getUser('user', true);
  const ticket = await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  if (user.id === ticket.userId) {
    await interaction.reply({ embeds: [errorEmbed('Cannot remove ticket creator.')], ephemeral: true });
    return;
  }

  const channel = interaction.channel as TextChannel;
  await channel.permissionOverwrites.delete(user.id);
  await interaction.reply({ embeds: [successEmbed(`Removed ${user.tag} from this ticket.`)] });
}

async function handleRemoveUser(interaction: any, client: BotClient, ticketConfig: any, data: string): Promise<void> {
  // Not used for buttons
}

async function handleTranscript(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  await handleTranscriptTicket(interaction, client, ticketConfig, (await getTicketByChannel(interaction.channelId))?.id || '');
}

async function handleTranscriptTicket(interaction: any, client: BotClient, ticketConfig: any, ticketId: string): Promise<void> {
  const ticket = ticketId ? await (await import('../../utils/database.js')).getTicketById(ticketId) : await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  const messages = await getTicketMessages(ticket.id);
  const user = await client.users.fetch(ticket.userId).catch(() => null);
  const claimedBy = ticket.claimedBy ? await client.users.fetch(ticket.claimedBy).catch(() => null) : null;

  let transcript = `Ticket Transcript - ${ticket.id}\n`;
  transcript += `User: ${user?.tag || ticket.userId}\n`;
  transcript += `Status: ${ticket.status}\n`;
  transcript += `Created: ${ticket.createdAt.toISOString()}\n`;
  transcript += `Closed: ${ticket.closedAt?.toISOString() || 'N/A'}\n`;
  transcript += `Claimed By: ${claimedBy?.tag || 'None'}\n\n`;

  for (const msg of messages) {
    const msgUser = await client.users.fetch(msg.userId).catch(() => ({ tag: 'Unknown' }));
    transcript += `[${msg.createdAt.toISOString()}] ${msgUser.tag}: ${msg.content}\n`;
    if (msg.attachments.length > 0) {
      transcript += `  Attachments: ${msg.attachments.join(', ')}\n`;
    }
  }

  const buffer = Buffer.from(transcript, 'utf-8');
  await interaction.editReply({ 
    files: [{ attachment: buffer, name: `transcript-${ticket.id.slice(0, 8)}.txt` }],
    content: 'Here is the transcript:'
  });
}

async function handleReopen(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  await handleReopenTicket(interaction, client, ticketConfig, (await getTicketByChannel(interaction.channelId))?.id || '');
}

async function handleReopenTicket(interaction: any, client: BotClient, ticketConfig: any, ticketId: string): Promise<void> {
  const ticket = ticketId ? await (await import('../../utils/database.js')).getTicketById(ticketId) : await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  if (ticket.status !== TICKET_STATUS.CLOSED) {
    await interaction.reply({ embeds: [errorEmbed('Ticket is not closed.')], ephemeral: true });
    return;
  }

  await updateTicket(ticket.id, { status: TICKET_STATUS.OPEN, claimedBy: undefined, closedAt: null });

  const closeButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_CLOSE}${ticket.id}`)
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger)
    .setEmoji(EMOJIS.CLOSE);
  const claimButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_CLAIM}${ticket.id}`)
    .setLabel('Claim')
    .setStyle(ButtonStyle.Success)
    .setEmoji(EMOJIS.CLAIM);
  const transcriptButton = new ButtonBuilder()
    .setCustomId(`${CUSTOM_ID_PREFIXES.TICKET_TRANSCRIPT}${ticket.id}`)
    .setLabel('Transcript')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji(EMOJIS.TRANSCRIPT);

  const embed = ticketEmbed(`Ticket reopened by ${interaction.user.tag}`)
    .setTitle(`${EMOJIS.REOPEN} Ticket Reopened`);

  await interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(closeButton, claimButton, transcriptButton)] });
}

async function handleDelete(interaction: ChatInputCommandInteraction, client: BotClient, ticketConfig: any): Promise<void> {
  await handleDeleteTicket(interaction, client, ticketConfig, (await getTicketByChannel(interaction.channelId))?.id || '');
}

async function handleDeleteTicket(interaction: any, client: BotClient, ticketConfig: any, ticketId: string): Promise<void> {
  const ticket = ticketId ? await (await import('../../utils/database.js')).getTicketById(ticketId) : await getTicketByChannel(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ embeds: [errorEmbed('No ticket found in this channel.')], ephemeral: true });
    return;
  }

  await updateTicket(ticket.id, { status: TICKET_STATUS.DELETED });
  
  await interaction.reply({ content: 'Deleting ticket channel in 5 seconds...', ephemeral: true });
  setTimeout(async () => {
    try {
      const channel = interaction.guild!.channels.cache.get(ticket.channelId);
      if (channel) await channel.delete('Ticket deleted');
    } catch (error) {
      logger.error('Failed to delete ticket channel:', error);
    }
  }, 5000);
}

export default ticketCommand;