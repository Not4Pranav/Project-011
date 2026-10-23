import { Events, Message, Collection } from 'discord.js';
import { BotClient } from '../structures/ExtendedClient.js';
import { getGuildConfig } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message: Message, client: BotClient): Promise<void> {
    if (message.author.bot || !message.guild) return;

    await handleSnipeStorage(message, client);
    await handlePrefixCommand(message, client);
  },
};

async function handleSnipeStorage(message: Message, client: BotClient): Promise<void> {
  const { createSnipedMessage } = await import('../utils/database.js');
  try {
    await createSnipedMessage({
      guildId: message.guild!.id,
      channelId: message.channel.id,
      userId: message.author.id,
      content: message.content,
      attachments: message.attachments.map(a => a.url),
      embeds: message.embeds.length > 0 ? message.embeds.map(e => e.toJSON()) : undefined,
    });
  } catch (error) {
    logger.error('Failed to store sniped message:', error);
  }
}

async function handlePrefixCommand(message: Message, client: BotClient): Promise<void> {
  const guildConfig = await getGuildConfig(message.guild!.id);
  const prefix = guildConfig?.prefix ?? '!';

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const commandName = args.shift()?.toLowerCase();
  if (!commandName) return;

  const command = client.prefixCommands.get(commandName) ?? 
    [...client.prefixCommands.values()].find(c => c.aliases?.includes(commandName));
  
  if (!command) return;

  const { hasPermission } = await import('../utils/permissions.js');
  const member = message.member;
  if (!member) return;
  
  const permCheck = await hasPermission(member, command.permissionLevel ?? 0);
  if (!permCheck.hasPermission) {
    await message.reply({ content: `❌ You need permission level ${command.permissionLevel ?? 0} to use this command.` });
    return;
  }

  if (!checkCooldown(client, commandName, message.author.id, command.cooldown)) {
    await message.reply('⏳ Command on cooldown. Please wait.');
    return;
  }

  try {
    await command.execute(message, args, client);
  } catch (error) {
    logger.error(`Error executing prefix command ${commandName}:`, error);
    await message.reply('An error occurred while executing this command.');
  }
}

function checkCooldown(client: BotClient, commandName: string, userId: string, cooldown?: number): boolean {
  if (!cooldown) return true;
  const now = Date.now();
  const timestamps = client.cooldowns.get(commandName) ?? new Collection<string, number>();
  const expirationTime = timestamps.get(userId) ?? 0;

  if (now < expirationTime) return false;

  timestamps.set(userId, now + cooldown);
  client.cooldowns.set(commandName, timestamps);
  return true;
}