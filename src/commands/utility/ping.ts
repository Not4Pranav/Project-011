import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, errorEmbed } from '../../utils/embeds.js';
import { PERMISSION_LEVELS, EMOJIS, COLORS } from '../../utils/constants.js';

const pingCommand: Command = {
  data: {
    name: 'ping',
    description: 'Check bot latency',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws = client.ws.ping;

    const embed = utilityEmbed(
      `**WebSocket:** ${ws}ms\n` +
      `**Roundtrip:** ${roundtrip}ms\n` +
      `**Uptime:** <t:${Math.floor((Date.now() - client.uptime!) / 1000)}:R>`
    ).setTitle(`${EMOJIS.PING} Pong!`)
      .setColor(ws < 100 ? COLORS.SUCCESS : ws < 250 ? COLORS.WARNING : COLORS.ERROR);

    await interaction.editReply({ content: null, embeds: [embed] });
  },
};

export default pingCommand;