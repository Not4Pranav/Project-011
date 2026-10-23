import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, MessageFlags, TextChannel } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { modEmbed, errorEmbed, successEmbed } from '../../utils/embeds.js';
import { createModCase, getModConfig } from '../../utils/database.js';
import { PERMISSION_LEVELS, CASE_TYPES, EMOJIS, LIMITS } from '../../utils/constants.js';
import { logger } from '../../utils/logger.js';

const purgeCommand: Command = {
  data: {
    name: 'purge',
    description: 'Delete messages from a channel',
    permissionLevel: PERMISSION_LEVELS.MODERATOR,
    cooldown: 10000,
    options: [
      { name: 'amount', description: 'Number of messages to delete (1-100)', type: 4, required: true, min_value: 1, max_value: 100 },
      { name: 'user', description: 'Only delete messages from this user', type: 6, required: false },
      { name: 'reason', description: 'Reason for purge', type: 3, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const moderator = interaction.user;
    const channel = interaction.channel!;

    if (amount > LIMITS.MAX_PURGE) {
      await interaction.reply({ embeds: [errorEmbed(`Cannot purge more than ${LIMITS.MAX_PURGE} messages at once.`)], ephemeral: true });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const messages = await channel.messages.fetch({ limit: amount });
      let messagesToDelete = messages.filter(msg => !msg.system && (Date.now() - msg.createdTimestamp) < 1209600000);

      if (targetUser) {
        messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
      }

      const deleted = await (channel as TextChannel).bulkDelete(messagesToDelete, true);
      const actualAmount = deleted.size;

      const modConfig = await getModConfig(interaction.guildId!);
      
      if (modConfig) {
        const modCase = await createModCase(modConfig.id, {
          type: CASE_TYPES.PURGE,
          userId: targetUser?.id || 'multiple',
          moderatorId: moderator.id,
          reason,
          duration: actualAmount,
        });

        const embed = modEmbed(`**Channel:** ${channel}\n**Messages Deleted:** ${actualAmount}\n**Target User:** ${targetUser ? `${targetUser.tag} (${targetUser.id})` : 'All users'}\n**Reason:** ${reason}\n**Case ID:** ${modCase.id}`);
        embed.setTitle(`${EMOJIS.PURGE} Messages Purged`);

        if (modConfig.logChannelId) {
          const logChannel = interaction.guild!.channels.cache.get(modConfig.logChannelId);
          if (logChannel?.isTextBased()) {
            await logChannel.send({ embeds: [embed] });
          }
        }
      }

      await interaction.editReply({ embeds: [successEmbed(`Deleted ${actualAmount} messages.`)] });
      
      setTimeout(() => interaction.deleteReply().catch(() => {}), 5000);
    } catch (error) {
      logger.error('Purge command error:', error);
      await interaction.editReply({ embeds: [errorEmbed('Failed to purge messages. Messages older than 14 days cannot be bulk deleted.')] });
    }
  },
};

export default purgeCommand;