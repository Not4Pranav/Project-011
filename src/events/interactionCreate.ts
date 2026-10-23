import { Events, Interaction, Collection } from 'discord.js';
import { BotClient } from '../structures/ExtendedClient.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction, client: BotClient): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction, client);
      } else if (interaction.isButton()) {
        await handleButton(interaction, client);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction, client);
      } else if (interaction.isModalSubmit()) {
        await handleModal(interaction, client);
      } else if (interaction.isAutocomplete()) {
        await handleAutocomplete(interaction, client);
      }
    } catch (error) {
      logger.error('Interaction error:', error);
      await sendErrorReply(interaction, 'An error occurred while processing this interaction.');
    }
  },
};

async function handleSlashCommand(interaction: any, client: BotClient): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    return;
  }

  const permissionLevel = command.data.permissionLevel ?? 0;
  const { hasPermission } = await import('../utils/permissions.js');
  const permCheck = await hasPermission(interaction.member, permissionLevel);
  
  if (!permCheck.hasPermission) {
    await interaction.reply({ 
      content: `❌ You need permission level ${permissionLevel} (${permCheck.level}) to use this command.`, 
      ephemeral: true 
    });
    return;
  }

  if (!checkCooldown(client, interaction.commandName, interaction.user.id, command.data.cooldown)) {
    await interaction.reply({ content: '⏳ Command on cooldown. Please wait.', ephemeral: true });
    return;
  }

  try {
    await command.execute(interaction, client);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    await sendErrorReply(interaction, 'An error occurred while executing this command.');
  }
}

async function handleButton(interaction: any, client: BotClient): Promise<void> {
  const [prefix, ...parts] = interaction.customId.split('_');
  const action = `${prefix}_${parts[0]}`;
  const data = parts.slice(1).join('_');

  for (const command of client.commands.values()) {
    if (command.handleButton) {
      try {
        await command.handleButton(interaction, client, action, data);
      } catch (error) {
        logger.error(`Button handler error for ${action}:`, error);
      }
    }
  }
}

async function handleSelectMenu(interaction: any, client: BotClient): Promise<void> {
  const [prefix, ...parts] = interaction.customId.split('_');
  const action = `${prefix}_${parts[0]}`;
  const data = parts.slice(1).join('_');

  for (const command of client.commands.values()) {
    if (command.handleSelectMenu) {
      try {
        await command.handleSelectMenu(interaction, client, action, data);
      } catch (error) {
        logger.error(`Select menu handler error for ${action}:`, error);
      }
    }
  }
}

async function handleModal(interaction: any, client: BotClient): Promise<void> {
  const [prefix, ...parts] = interaction.customId.split('_');
  const action = `${prefix}_${parts[0]}`;
  const data = parts.slice(1).join('_');

  for (const command of client.commands.values()) {
    if (command.handleModal) {
      try {
        await command.handleModal(interaction, client, action, data);
      } catch (error) {
        logger.error(`Modal handler error for ${action}:`, error);
      }
    }
  }
}

async function handleAutocomplete(interaction: any, client: BotClient): Promise<void> {
  const command = client.commands.get(interaction.commandName);
  if (command?.autocomplete) {
    try {
      await command.autocomplete(interaction, client);
    } catch (error) {
      logger.error(`Autocomplete error for ${interaction.commandName}:`, error);
    }
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

async function sendErrorReply(interaction: any, message: string): Promise<void> {
  try {
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, ephemeral: true });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  } catch {
    // Ignore errors in error handling
  }
}