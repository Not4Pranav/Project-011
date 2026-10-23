import { Events, GuildMember } from 'discord.js';
import { BotClient } from '../structures/ExtendedClient.js';
import { getWelcomeConfig } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember, client: BotClient): Promise<void> {
    try {
      const welcomeConfig = await getWelcomeConfig(member.guild.id);
      if (!welcomeConfig?.enabled) return;

      // Handle fake user detection
      if (welcomeConfig.fakeUserCheck) {
        const isFake = await checkFakeUser(member);
        if (isFake) {
          await handleFakeUser(member, welcomeConfig);
          return;
        }
      }

      // Handle invite tracking
      if (welcomeConfig.inviteTracking) {
        await trackInvite(member);
      }

      // Send welcome message
      await sendWelcomeMessage(member, welcomeConfig);

      // Assign auto-role
      if (welcomeConfig.roleId) {
        await assignAutoRole(member, welcomeConfig.roleId);
      }

      // Send DM welcome
      if (welcomeConfig.dmEnabled && welcomeConfig.dmMessage) {
        await sendDMWelcome(member, welcomeConfig.dmMessage);
      }
    } catch (error) {
      logger.error('GuildMemberAdd error:', error);
    }
  },
};

async function checkFakeUser(member: GuildMember): Promise<boolean> {
  const accountAge = Date.now() - member.user.createdTimestamp;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const checks = [
    accountAge < sevenDays,
    !member.user.avatar,
    member.user.username.match(/^[a-zA-Z]+\d{4,}$/),
    member.guild.members.cache.filter(m => m.id === member.id).size === 0,
  ];

  return checks.filter(Boolean).length >= 2;
}

async function handleFakeUser(member: GuildMember, welcomeConfig: any): Promise<void> {
  if (welcomeConfig.logChannelId) {
    const logChannel = member.guild.channels.cache.get(welcomeConfig.logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({
        content: `⚠️ **Potential fake user detected:** ${member.user.tag} (${member.id})\nAccount age: ${Math.floor((Date.now() - member.user.createdTimestamp) / 86400000)} days`,
      });
    }
  }
}

async function trackInvite(member: GuildMember): Promise<void> {
  // Invite tracking logic would go here
  // Requires caching guild.invites.fetch() on ready and inviteCreate/inviteDelete events
}

async function sendWelcomeMessage(member: GuildMember, welcomeConfig: any): Promise<void> {
  if (!welcomeConfig.channelId) return;
  
  const channel = member.guild.channels.cache.get(welcomeConfig.channelId);
  if (!channel?.isTextBased()) return;

  const welcomeMessage = welcomeConfig.messages.find((m: any) => m.type === 'WELCOME');
  if (!welcomeMessage) return;

  const { welcomeEmbedCustom } = await import('../utils/embeds.js');
  const embed = welcomeEmbedCustom(member, welcomeMessage.content, welcomeMessage.embedData);
  
  await channel.send({ embeds: [embed] }).catch(() => {});
}

async function assignAutoRole(member: GuildMember, roleId: string): Promise<void> {
  const role = member.guild.roles.cache.get(roleId);
  if (role && !member.roles.cache.has(roleId)) {
    await member.roles.add(role).catch(() => {});
  }
}

async function sendDMWelcome(member: GuildMember, message: string): Promise<void> {
  try {
    await member.send(message.replace('{user}', member.toString()).replace('{server}', member.guild.name));
  } catch {
    // User has DMs disabled
  }
}