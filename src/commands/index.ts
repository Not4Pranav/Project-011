import { readdirSync } from 'fs';
import { join } from 'path';
import type { BotClient } from '../structures/ExtendedClient.js';
import type { Command, PrefixCommand } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function loadCommands(client: BotClient): Promise<void> {
  const commandsPath = join(process.cwd(), 'src', 'commands');
  const commandFolders = readdirSync(commandsPath);

  let slashCount = 0;
  let prefixCount = 0;

  for (const folder of commandFolders) {
    const folderPath = join(commandsPath, folder);
    const commandFiles = readdirSync(folderPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = join(folderPath, file);
      try {
        const module = await import(filePath);
        
        if (module.default && isSlashCommand(module.default)) {
          const command: Command = module.default;
          client.commands.set(command.data.name, command);
          slashCount++;
        } else if (module.default && isPrefixCommand(module.default)) {
          const command: PrefixCommand = module.default;
          client.prefixCommands.set(command.name, command);
          if (command.aliases) {
            for (const alias of command.aliases) {
              client.prefixCommands.set(alias, command);
            }
          }
          prefixCount++;
        } else if (module.commands) {
          for (const cmd of module.commands) {
            if (isSlashCommand(cmd)) {
              client.commands.set(cmd.data.name, cmd);
              slashCount++;
            } else if (isPrefixCommand(cmd)) {
              client.prefixCommands.set(cmd.name, cmd);
              if (cmd.aliases) {
                for (const alias of cmd.aliases) {
                  client.prefixCommands.set(alias, cmd);
                }
              }
              prefixCount++;
            }
          }
        }
      } catch (error) {
        logger.error(`Failed to load command ${file}:`, error);
      }
    }
  }

  logger.info(`Loaded ${slashCount} slash commands and ${prefixCount} prefix commands`);
}

function isSlashCommand(obj: Record<string, unknown>): obj is Command & Record<string, unknown> {
  return obj && typeof obj === 'object' && 'data' in obj && 'execute' in obj && typeof obj.execute === 'function';
}

function isPrefixCommand(obj: Record<string, unknown>): obj is PrefixCommand & Record<string, unknown> {
  return obj && typeof obj === 'object' && 'name' in obj && 'execute' in obj && typeof obj.execute === 'function' && !('data' in obj);
}

export function unloadCommand(client: BotClient, name: string): void {
  client.commands.delete(name);
  client.prefixCommands.delete(name);
}

export function reloadCommand(client: BotClient, filePath: string): Promise<void> {
  delete require.cache[require.resolve(filePath)];
  return loadCommands(client);
}