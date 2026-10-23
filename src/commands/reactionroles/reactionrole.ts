import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType, Message, Role } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { infoEmbed, errorEmbed, successEmbed, warningEmbed } from '../../utils/embeds.js';
import { getReactionRoleConfig, createReactionRoleConfig, updateReactionRoleConfig, createReactionRoleMessage, getReactionRoleMessages, getReactionRolesForMessage, addReactionRole, removeReactionRole, getReactionRoleMessage, getReactionRolesForMessage as getReactionRoles, getReactionRoleByRoleId, updateReactionRole, deleteReactionRoleMessage } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const reactionroleCommand: Command = {
  data: {
    name: 'reactionrole',
    description: 'Manage reaction roles',
    permissionLevel: PERMISSION_LEVELS.ADMIN,
    cooldown: 5000,
    options: [
      {
        name: 'setup',
        description: 'Set up Reaction Roles',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel for the panel', type: 7, required: true, channel_types: [0] },
        ],
      },
      {
        name: 'disable',
        description: 'Disable Reaction Roles',
        type: 1,
      },
      {
        name: 'create',
        description: 'Create a reaction role message',
        type: 1,
        options: [
          { name: 'channel', description: 'Channel to send message', type: 7, required: true, channel_types: [0] },
          { name: 'title', description: 'Message title', type: 3, required: true },
          { name: 'description', description: 'Message description', type: 3, required: true },
          { name: 'type', description: 'Role assignment type', type: 3, required: true, choices: [
            { name: 'Buttons', value: 'BUTTON' },
            { name: 'Dropdown', value: 'DROPDOWN' },
            { name: 'Reactions', value: 'REACTION' },
          ]},
          { name: 'mode', description: 'Role assignment mode', type: 3, required: true, choices: [
            { name: 'Unique (one role)', value: 'UNIQUE' },
            { name: 'Multiple (many roles)', value: 'MULTIPLE' },
            { name: 'Verify (one-time)', value: 'VERIFY' },
            { name: 'Remove (remove roles)', value: 'REMOVE' },
          ]},
        ],
      },
      {
        name: 'add',
        description: 'Add a role to a reaction role message',
        type: 1,
        options: [
          { name: 'message_id', description: 'Message ID of the panel', type: 3, required: true },
          { name: 'role', description: 'Role to assign', type: 8, required: true },
          { name: 'label', description: 'Button/Dropdown label', type: 3, required: true },
          { name: 'emoji', description: 'Emoji for button/reaction', type: 3, required: false },
          { name: 'description', description: 'Dropdown option description', type: 3, required: false },
        ],
      },
      {
        name: 'remove',
        description: 'Remove a role from a reaction role message',
        type: 1,
        options: [
          { name: 'message_id', description: 'Message ID of the panel', type: 3, required: true },
          { name: 'role', description: 'Role to remove', type: 8, required: true },
        ],
      },
      {
        name: 'edit',
        description: 'Edit a reaction role',
        type: 1,
        options: [
          { name: 'message_id', description: 'Message ID of the panel', type: 3, required: true },
          { name: 'role', description: 'Role to edit', type: 8, required: true },
          { name: 'label', description: 'New label', type: 3, required: false },
          { name: 'emoji', description: 'New emoji', type: 3, required: false },
          { name: 'description', description: 'New description', type: 3, required: false },
        ],
      },
      {
        name: 'list',
        description: 'List all reaction role messages',
        type: 1,
      },
      {
        name: 'delete',
        description: 'Delete a reaction role message',
        type: 1,
        options: [
          { name: 'message_id', description: 'Message ID to delete', type: 3, required: true },
        ],
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    try {
      switch (subcommand) {
        case 'setup':
          await handleSetup(interaction, client);
          break;
        case 'disable':
          await handleDisable(interaction, client);
          break;
        case 'create':
          await handleCreate(interaction, client);
          break;
        case 'add':
          await handleAddRole(interaction, client);
          break;
        case 'remove':
          await handleRemoveRole(interaction, client);
          break;
        case 'edit':
          await handleEditRole(interaction, client);
          break;
        case 'list':
          await handleList(interaction, client);
          break;
        case 'delete':
          await handleDelete(interaction, client);
          break;
      }
    } catch (error) {
      logger.error('ReactionRole command error:', error);
      await interaction.reply({ embeds: [errorEmbed('An error occurred.')], ephemeral: true });
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (!action.startsWith('rr_')) return;

    const [, buttonAction, messageId, roleId] = action.split('_');
    const guild = interaction.guild!;
    const user = interaction.user;
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: 'Member not found.', ephemeral: true });
      return;
    }

    const rrMessage = await getReactionRoleMessage(messageId);
    if (!rrMessage) {
      await interaction.reply({ content: 'Reaction role message not found.', ephemeral: true });
      return;
    }

    const rrRole = await getReactionRoleByRoleId(messageId, roleId);
    if (!rrRole) {
      await interaction.reply({ content: 'Role not found in this panel.', ephemeral: true });
      return;
    }

    const role = guild.roles.cache.get(roleId);
    if (!role) {
      await interaction.reply({ content: 'Role no longer exists.', ephemeral: true });
      return;
    }

    const hasRole = member.roles.cache.has(roleId);

    if (buttonAction === 'add') {
      if (rrMessage.mode === 'UNIQUE' && hasRole) {
        await interaction.reply({ content: 'You already have a role from this panel.', ephemeral: true });
        return;
      }
      if (rrMessage.mode === 'VERIFY' && hasRole) {
        await interaction.reply({ content: 'You are already verified.', ephemeral: true });
        return;
      }

      // For unique mode, remove other roles from this panel
      if (rrMessage.mode === 'UNIQUE' || rrMessage.mode === 'VERIFY') {
        const existingRoles = await getReactionRolesForMessage(messageId);
        for (const r of existingRoles) {
          if (r.roleId !== roleId && member.roles.cache.has(r.roleId)) {
            await member.roles.remove(r.roleId, 'Reaction role: unique mode');
          }
        }
      }

      await member.roles.add(role, 'Reaction role: button click');
      await interaction.reply({ content: `✅ Added role ${role.name}`, ephemeral: true });
    } else if (buttonAction === 'remove') {
      if (!hasRole) {
        await interaction.reply({ content: 'You don\'t have this role.', ephemeral: true });
        return;
      }
      await member.roles.remove(role, 'Reaction role: button click');
      await interaction.reply({ content: `✅ Removed role ${role.name}`, ephemeral: true });
    }
  },

  async handleSelectMenu(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (action !== 'rr_dropdown') return;

    const [, , messageId] = action.split('_');
    const selectedRoleId = interaction.values[0];
    const guild = interaction.guild!;
    const user = interaction.user;
    const member = await guild.members.fetch(user.id).catch(() => null);

    if (!member) {
      await interaction.reply({ content: 'Member not found.', ephemeral: true });
      return;
    }

    const rrMessage = await getReactionRoleMessage(messageId);
    if (!rrMessage) {
      await interaction.reply({ content: 'Reaction role message not found.', ephemeral: true });
      return;
    }

    const role = guild.roles.cache.get(selectedRoleId);
    if (!role) {
      await interaction.reply({ content: 'Role no longer exists.', ephemeral: true });
      return;
    }

    const hasRole = member.roles.cache.has(selectedRoleId);

    if (rrMessage.mode === 'UNIQUE' && hasRole) {
      await interaction.reply({ content: 'You already have a role from this panel.', ephemeral: true });
      return;
    }

    // For unique mode, remove other roles
    if (rrMessage.mode === 'UNIQUE' || rrMessage.mode === 'VERIFY') {
      const existingRoles = await getReactionRolesForMessage(messageId);
      for (const r of existingRoles) {
        if (r.roleId !== selectedRoleId && member.roles.cache.has(r.roleId)) {
          await member.roles.remove(r.roleId, 'Reaction role: dropdown');
        }
      }
    }

    if (hasRole && rrMessage.mode !== 'REMOVE') {
      await interaction.reply({ content: 'You already have this role.', ephemeral: true });
      return;
    }

    if (rrMessage.mode === 'REMOVE') {
      await member.roles.remove(role, 'Reaction role: dropdown');
      await interaction.reply({ content: `✅ Removed role ${role.name}`, ephemeral: true });
    } else {
      await member.roles.add(role, 'Reaction role: dropdown');
      await interaction.reply({ content: `✅ Added role ${role.name}`, ephemeral: true });
    }
  },

  async handleModal(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (!action.startsWith('rr_')) return;

    const [, modalAction, messageId, roleId] = action.split('_');
    if (modalAction !== 'edit') return;

    const label = interaction.fields.getTextInputValue('label');
    const emoji = interaction.fields.getTextInputValue('emoji');
    const description = interaction.fields.getTextInputValue('description');

    const updates: any = {};
    if (label) updates.label = label;
    if (emoji) updates.emoji = emoji;
    if (description) updates.description = description;

    await updateReactionRole(messageId, roleId, updates);
    await interaction.reply({ content: '✅ Role updated.', ephemeral: true });
  },
};

async function handleSetup(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  const guild = interaction.guild!;

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: 'Channel must be a text channel.', ephemeral: true });
    return;
  }

  await createReactionRoleConfig(guild.id, {
    enabled: true,
  });

  await interaction.reply({ content: '✅ Reaction Roles enabled.', ephemeral: true });
}

async function handleDisable(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  await updateReactionRoleConfig(guild.id, { enabled: false });
  await interaction.reply({ content: '❌ Reaction Roles disabled.', ephemeral: true });
}

async function handleCreate(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const channel = interaction.options.getChannel('channel', true);
  const title = interaction.options.getString('title', true);
  const description = interaction.options.getString('description', true);
  const type = interaction.options.getString('type', true) as 'BUTTON' | 'DROPDOWN' | 'REACTION';
  const mode = interaction.options.getString('mode', true) as 'UNIQUE' | 'MULTIPLE' | 'VERIFY' | 'REMOVE';
  const guild = interaction.guild!;

  if (channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: 'Channel must be a text channel.', ephemeral: true });
    return;
  }

  let components: any[] = [];
  const textChannel = channel as any;

  if (type === 'BUTTON') {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('rr_placeholder')
          .setLabel('Add Role')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('➕')
          .setDisabled(true)
      );
    components = [row];
  } else if (type === 'DROPDOWN') {
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('rr_dropdown_placeholder')
          .setPlaceholder('Select a role...')
          .addOptions(
            new StringSelectMenuOptionBuilder()
              .setLabel('Add Role')
              .setValue('placeholder')
              .setDescription('Use /reactionrole add to add roles')
          )
      );
    components = [row];
  }

  const embed = infoEmbed(description)
    .setTitle(`${EMOJIS.ROLE} ${title}`)
    .setColor(0x5865F2);

  const message = await textChannel.send({ embeds: [embed], components });

  const rrMessage = await createReactionRoleMessage(guild.id, {
    messageId: message.id,
    channelId: channel.id,
    type,
    mode,
    title,
    description,
  });

  await interaction.reply({ content: `✅ Reaction role panel created in ${channel}`, ephemeral: true });
}

async function handleAddRole(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  const role = interaction.options.getRole('role', true);
  const label = interaction.options.getString('label', true);
  const emoji = interaction.options.getString('emoji');
  const description = interaction.options.getString('description');
  const guild = interaction.guild!;

  const rrMessage = await getReactionRoleMessage(messageId);
  if (!rrMessage) {
    await interaction.reply({ content: 'Reaction role message not found.', ephemeral: true });
    return;
  }

  const channel = guild.channels.cache.get(rrMessage.channelId) as any;
  if (!channel) {
    await interaction.reply({ content: 'Channel not found.', ephemeral: true });
    return;
  }

  const message = await channel.messages.fetch(messageId).catch(() => null);
  if (!message) {
    await interaction.reply({ content: 'Message not found.', ephemeral: true });
    return;
  }

  await addReactionRole(rrMessage.id, {
    roleId: role.id,
    label,
    emoji: emoji ?? undefined,
    description: description ?? undefined,
  });

  await updateMessageComponents(client, message, rrMessage);

  await interaction.reply({ content: `✅ Added ${role.name} to panel`, ephemeral: true });
}

async function handleRemoveRole(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  const role = interaction.options.getRole('role', true);
  const guild = interaction.guild!;

  await removeReactionRole(messageId, role.id);

  const rrMessage = await getReactionRoleMessage(messageId);
  if (rrMessage) {
    const channel = guild.channels.cache.get(rrMessage.channelId) as any;
    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await updateMessageComponents(client, message, rrMessage);
      }
    }
  }

  await interaction.reply({ content: `✅ Removed role from panel`, ephemeral: true });
}

async function handleEditRole(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  const role = interaction.options.getRole('role', true);
  const label = interaction.options.getString('label');
  const emoji = interaction.options.getString('emoji');
  const description = interaction.options.getString('description');

  const updates: any = {};
  if (label) updates.label = label;
  if (emoji) updates.emoji = emoji;
  if (description) updates.description = description;

  await updateReactionRole(messageId, role.id, updates);
  await interaction.reply({ content: '✅ Role updated.', ephemeral: true });
}

async function handleList(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  const messages = await getReactionRoleMessages(guild.id) as Array<{ id: string; channelId: string; messageId: string; title: string; description: string; configId: string; type: string; mode: string; roles: Array<{ roleId: string; label: string }> }>;

  if (messages.length === 0) {
    await interaction.reply({ content: 'No reaction role messages.', ephemeral: true });
    return;
  }

  let description = '';
  for (const msg of messages) {
    description += `**${msg.title}** (${msg.type}) - ${msg.roles.length} roles - [Jump](https://discord.com/channels/${guild.id}/${msg.channelId}/${msg.messageId})\n`;
  }

  const embed = infoEmbed(description).setTitle(`${EMOJIS.ROLE} Reaction Role Panels`);
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleDelete(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  const guild = interaction.guild!;

  const rrMessage = await getReactionRoleMessage(messageId);
  if (rrMessage) {
    const channel = guild.channels.cache.get(rrMessage.channelId) as any;
    if (channel) {
      const message = await channel.messages.fetch(messageId).catch(() => null);
      if (message) await message.delete().catch(() => {});
    }
  }

  await deleteReactionRoleMessage(messageId);
  await interaction.reply({ content: '✅ Reaction role panel deleted.', ephemeral: true });
}

async function updateMessageComponents(client: BotClient, message: any, rrMessage: any): Promise<void> {
  const roles = await getReactionRolesForMessage(rrMessage.id);
  if (roles.length === 0) return;

  let components: any[] = [];
  
  if (rrMessage.type === 'BUTTON') {
    const rows: any[] = [];
    for (let i = 0; i < roles.length; i += 5) {
      const row = new ActionRowBuilder<ButtonBuilder>();
      roles.slice(i, i + 5).forEach(r => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`rr_add_${rrMessage.id}_${r.roleId}`)
            .setLabel(r.label)
            .setStyle(ButtonStyle.Primary)
            .setEmoji(r.emoji || '🎭')
        );
      });
      rows.push(row);
    }
    components = rows;
  } else if (rrMessage.type === 'DROPDOWN') {
    const options = roles.map(r => 
      new StringSelectMenuOptionBuilder()
        .setLabel(r.label)
        .setValue(r.roleId)
        .setDescription(r.description || '')
        .setEmoji(r.emoji || '🎭')
    );
    const row = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`rr_dropdown_${rrMessage.id}`)
          .setPlaceholder('Select a role...')
          .addOptions(options)
      );
    components = [row];
  }

  await message.edit({ components }).catch(() => {});
}

export default reactionroleCommand;