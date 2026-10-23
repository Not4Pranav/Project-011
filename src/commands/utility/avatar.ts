import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed } from '../../utils/embeds.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';

const avatarCommand: Command = {
  data: {
    name: 'avatar',
    description: 'Show a user\'s avatar',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to show avatar for', type: 6, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    
    const embed = utilityEmbed(`**User:** ${targetUser.tag}`)
      .setTitle(`${EMOJIS.AVATAR} Avatar`)
      .setImage(targetUser.displayAvatarURL({ size: 512, extension: 'png' }))
      .setURL(targetUser.displayAvatarURL({ size: 512 }));

    await interaction.reply({ embeds: [embed] });
  },
};

export default avatarCommand;