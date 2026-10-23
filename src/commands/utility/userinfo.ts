import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, User, GuildMember } from 'discord.js';
import { BotClient } from '../../types/index.js';
import { Command } from '../../types/index.js';
import { utilityEmbed, userInfoEmbed } from '../../utils/embeds.js';
import { PERMISSION_LEVELS, EMOJIS } from '../../utils/constants.js';

const userinfoCommand: Command = {
  data: {
    name: 'userinfo',
    description: 'Show user information',
    permissionLevel: PERMISSION_LEVELS.EVERYONE,
    cooldown: 5000,
    options: [
      { name: 'user', description: 'User to show info for', type: 6, required: false },
    ],
  },

  async execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;
    
    const embed = userInfoEmbed(targetUser, member);
    
    await interaction.reply({ embeds: [embed] });
  },
};

export default userinfoCommand;