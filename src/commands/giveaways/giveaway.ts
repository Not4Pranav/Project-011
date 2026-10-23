import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { gameEmbed, errorEmbed, successEmbed, infoEmbed } from '../../utils/embeds.js';
import { getGameConfig, createGiveaway, getGiveaways, getGiveawayByMessageId } from '../../utils/database.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const giveawayCommand: Command = {
  data: {
    name: 'giveaway',
    description: 'Manage giveaways',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 5000,
    options: [
      {
        name: 'create',
        description: 'Create a giveaway',
        type: 1,
        options: [
          { name: 'prize', description: 'Giveaway prize', type: 3, required: true },
          { name: 'duration', description: 'Duration in minutes', type: 4, required: true, min_value: 1 },
          { name: 'winners', description: 'Number of winners', type: 4, required: false, min_value: 1, max_value: 20 },
          { name: 'channel', description: 'Channel to host giveaway', type: 7, required: false, channel_types: [0] },
          { name: 'description', description: 'Giveaway description', type: 3, required: false },
        ],
      },
      {
        name: 'end',
        description: 'End a giveaway early',
        type: 1,
        options: [
          { name: 'message_id', description: 'Giveaway message ID', type: 3, required: true },
        ],
      },
      {
        name: 'reroll',
        description: 'Reroll giveaway winners',
        type: 1,
        options: [
          { name: 'message_id', description: 'Giveaway message ID', type: 3, required: true },
        ],
      },
      {
        name: 'list',
        description: 'List active giveaways',
        type: 1,
      },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild!;

    switch (subcommand) {
      case 'create':
        await handleCreate(interaction, client);
        break;
      case 'end':
        await handleEnd(interaction, client);
        break;
      case 'reroll':
        await handleReroll(interaction, client);
        break;
      case 'list':
        await handleList(interaction, client);
        break;
    }
  },

  async handleButton(interaction: any, client: BotClient, action: string, data: string): Promise<void> {
    if (action === 'giveaway_join') {
      const messageId = data;
      const userId = interaction.user.id;
      
      try {
        const giveaway = await getGiveawayByMessageId(messageId);
        if (!giveaway) {
          await interaction.reply({ content: 'Giveaway not found.', ephemeral: true });
          return;
        }
        
        if (giveaway.ended) {
          await interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
          return;
        }
        
        if (Date.now() > giveaway.endsAt.getTime()) {
          await interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
          return;
        }
        
        const participants = giveaway.participants as string[] || [];
        if (participants.includes(userId)) {
          await interaction.reply({ content: 'You have already entered this giveaway!', ephemeral: true });
          return;
        }
        
        participants.push(userId);
        await updateGiveaway(messageId, { participants });
        
        await interaction.reply({ content: `✅ You have entered the giveaway for **${giveaway.prize}**!`, ephemeral: true });
      } catch (error) {
        logger.error('Giveaway join error:', error);
        await interaction.reply({ content: 'Failed to enter giveaway.', ephemeral: true });
      }
    }
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const prize = interaction.options.getString('prize', true);
  const duration = interaction.options.getInteger('duration', true);
  const winners = interaction.options.getInteger('winners') || 1;
  const channel = (interaction.options.getChannel('channel') as any) || interaction.channel;
  const description = interaction.options.getString('description') || `React with 🎉 to enter!`;
  const guild = interaction.guild!;

  try {
    const gameConfig = await getGameConfig(guild.id);
    
    if (!gameConfig || !gameConfig.economyEnabled) {
      await interaction.reply({ embeds: [errorEmbed('Economy system is not enabled in this server.')], ephemeral: true });
      return;
    }

    if (channel.type !== 0) {
      await interaction.reply({ content: 'Channel must be a text channel.', ephemeral: true });
      return;
    }

    const endsAt = new Date(Date.now() + duration * 60 * 1000);
    const endsAtTimestamp = Math.floor(endsAt.getTime() / 1000);

    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');

    const joinButton = new ButtonBuilder()
      .setCustomId(`giveaway_join_${interaction.id}`)
      .setLabel('Join Giveaway')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('🎉');

    const embed = gameEmbed(
      `**Prize:** ${prize}\n` +
      `**Winners:** ${winners}\n` +
      `**Ends:** <t:${endsAtTimestamp}:R> (<t:${endsAtTimestamp}:F>)\n` +
      `**Hosted by:** ${interaction.user.tag}\n\n` +
      description
    ).setTitle(`${EMOJIS.GIVEAWAY} ${prize}`)
      .setColor(0xFF69B4)
      .setTimestamp(endsAt)
      .setFooter({ text: `${winners} winner(s) | Ends at` });

    const message = await channel.send({ 
      embeds: [embed], 
      components: [new ActionRowBuilder().addComponents(joinButton)] 
    });

    await createGiveaway({
      configId: gameConfig.id,
      messageId: message.id,
      channelId: channel.id,
      prize,
      winners,
      endsAt,
      description,
    });

    // Schedule automatic end
    setTimeout(async () => {
      await endGiveawayAuto(message.id, client);
    }, duration * 60 * 1000);

    await interaction.reply({ content: '✅ Giveaway created!', ephemeral: true });
  } catch (error) {
    logger.error('Giveaway create error:', error);
    await interaction.reply({ embeds: [errorEmbed('Failed to create giveaway.')], ephemeral: true });
  }
}

async function endGiveawayAuto(messageId: string, client: BotClient): Promise<void> {
  try {
    const giveaway = await getGiveawayByMessageId(messageId);
    if (!giveaway || giveaway.ended) return;

    const channel = client.channels.cache.get(giveaway.channelId) as any;
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    const participants = giveaway.participants as string[] || [];
    if (participants.length === 0) {
      const embed = gameEmbed('No participants!').setTitle(`${EMOJIS.GIVEAWAY} Giveaway Ended`).setColor(0xED4245);
      await message.edit({ embeds: [embed], components: [] });
      await updateGiveaway(messageId, { ended: true });
      return;
    }

    const shuffled = participants.sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, giveaway.winners);

    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');
    const embed = gameEmbed(
      `**Prize:** ${giveaway.prize}\n` +
      `**Winner(s):** ${winnerMentions}\n\n` +
      `Congratulations! 🎉`
    ).setTitle(`${EMOJIS.GIVEAWAY} Giveaway Ended - ${giveaway.prize}`)
      .setColor(0x57F287);

    await message.edit({ embeds: [embed], components: [] });
    await channel.send({ content: `🎉 Congratulations ${winnerMentions}! You won **${giveaway.prize}**!` });
    
    await updateGiveaway(messageId, { ended: true, winnerIds: winners.join(',') });
  } catch (error) {
    logger.error('Giveaway auto-end error:', error);
  }
}

async function handleEnd(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  
  try {
    const giveaway = await getGiveawayByMessageId(messageId);
    if (!giveaway) {
      await interaction.reply({ content: 'Giveaway not found.', ephemeral: true });
      return;
    }

    if (giveaway.ended) {
      await interaction.reply({ content: 'Giveaway already ended.', ephemeral: true });
      return;
    }

    await endGiveawayAuto(messageId, client);
    await interaction.reply({ content: '✅ Giveaway ended manually.', ephemeral: true });
  } catch (error) {
    logger.error('Giveaway end error:', error);
    await interaction.reply({ embeds: [errorEmbed('Failed to end giveaway.')], ephemeral: true });
  }
}

async function handleReroll(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const messageId = interaction.options.getString('message_id', true);
  
  try {
    const giveaway = await getGiveawayByMessageId(messageId);
    if (!giveaway) {
      await interaction.reply({ content: 'Giveaway not found.', ephemeral: true });
      return;
    }

    if (!giveaway.ended) {
      await interaction.reply({ content: 'Giveaway has not ended yet.', ephemeral: true });
      return;
    }

    const participants = giveaway.participants as string[] || [];
    if (participants.length === 0) {
      await interaction.reply({ content: 'No participants to reroll.', ephemeral: true });
      return;
    }

    const shuffled = participants.sort(() => Math.random() - 0.5);
    const winners = shuffled.slice(0, giveaway.winners);
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    await interaction.reply({ content: `🎉 Rerolled winners: ${winnerMentions}!` });
  } catch (error) {
    logger.error('Giveaway reroll error:', error);
    await interaction.reply({ embeds: [errorEmbed('Failed to reroll giveaway.')], ephemeral: true });
  }
}

async function handleList(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
  const guild = interaction.guild!;
  
  try {
    const gameConfig = await getGameConfig(guild.id);
    if (!gameConfig) {
      await interaction.reply({ content: 'No giveaways configured.', ephemeral: true });
      return;
    }

    const giveaways = await getGiveaways(gameConfig.id);
    const active = giveaways.filter(g => !g.ended && Date.now() < g.endsAt.getTime());
    const ended = giveaways.filter(g => g.ended || Date.now() >= g.endsAt.getTime());

    if (active.length === 0 && ended.length === 0) {
      await interaction.reply({ content: 'No giveaways found.', ephemeral: true });
      return;
    }

    let description = '';
    if (active.length > 0) {
      description += `**Active Giveaways:**\n`;
      for (const g of active) {
        description += `• **${g.prize}** - Ends <t:${Math.floor(g.endsAt.getTime() / 1000)}:R> - [Jump](https://discord.com/channels/${guild.id}/${g.channelId}/${g.messageId})\n`;
      }
    }
    if (ended.length > 0) {
      description += `\n**Ended Giveaways:**\n`;
      for (const g of ended.slice(0, 5)) {
        const winnerIds = g.winnerIds ? g.winnerIds.split(',') : [];
        const winnerMentions = winnerIds.map(id => `<@${id}>`).join(', ') || 'No winners';
        description += `• **${g.prize}** - Winner(s): ${winnerMentions}\n`;
      }
    }

    const embed = infoEmbed(description).setTitle(`${EMOJIS.GIVEAWAY} Giveaways`);
    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logger.error('Giveaway list error:', error);
    await interaction.reply({ embeds: [errorEmbed('Failed to list giveaways.')], ephemeral: true });
  }
}

async function updateGiveaway(messageId: string, data: { participants?: string[]; ended?: boolean; winnerIds?: string }) {
  const { prisma } = await import('../../database/client.js');
  return prisma.giveaway.update({
    where: { messageId },
    data,
  });
}

export default giveawayCommand;