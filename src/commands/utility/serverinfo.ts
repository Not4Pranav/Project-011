import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, serverInfoEmbed } from '../../utils/embeds.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';

const serverinfoCommand: Command = {
  data: {
    name: 'serverinfo',
    description: 'Show server information',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 10000,
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const guild = interaction.guild!;
    
    const embed = serverInfoEmbed(guild);
    
    await interaction.reply({ embeds: [embed] });
  },
};

export default serverinfoCommand;