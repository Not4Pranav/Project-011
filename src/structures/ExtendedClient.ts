import { Client, GatewayIntentBits, Partials, Collection, Events, REST, Routes } from 'discord.js';
import { config } from '../config/index.js';
import { Command, PrefixCommand, Event, SetupState, TicketPanelData } from '../types/index.js';
import { INTENTS, PARTIALS } from '../utils/constants.js';
import { logger } from '../utils/logger.js';

export class BotClient extends Client {
  commands: Collection<string, Command> = new Collection();
  prefixCommands: Collection<string, PrefixCommand> = new Collection();
  cooldowns: Collection<string, Collection<string, number>> = new Collection();
  setupStates: Collection<string, SetupState> = new Collection();
  ticketPanels: Collection<string, TicketPanelData> = new Collection();

  constructor() {
    super({
      intents: INTENTS.map(i => GatewayIntentBits[i as keyof typeof GatewayIntentBits]),
      partials: PARTIALS.map(p => Partials[p as keyof typeof Partials]),
    });
  }

  async start(): Promise<void> {
    this.setupEventHandlers();
    await this.login(config.discord.token);
  }

  private setupEventHandlers(): void {
    this.once(Events.ClientReady, this.handleReady.bind(this));
    this.on(Events.InteractionCreate, this.handleInteraction.bind(this));
    this.on(Events.MessageCreate, this.handleMessage.bind(this));
    this.on(Events.GuildMemberAdd, this.handleGuildMemberAdd.bind(this));
    this.on(Events.GuildMemberRemove, this.handleGuildMemberRemove.bind(this));
    this.on(Events.MessageDelete, this.handleMessageDelete.bind(this));
    this.on(Events.MessageUpdate, this.handleMessageUpdate.bind(this));
    this.on(Events.GuildBanAdd, this.handleGuildBanAdd.bind(this));
    this.on(Events.GuildBanRemove, this.handleGuildBanRemove.bind(this));
    this.on(Events.ChannelCreate, this.handleChannelCreate.bind(this));
    this.on(Events.ChannelDelete, this.handleChannelDelete.bind(this));
    this.on(Events.ChannelUpdate, this.handleChannelUpdate.bind(this));
    this.on(Events.Error, this.handleError.bind(this));
    this.on(Events.Warn, this.handleWarn.bind(this));

    process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    process.on('uncaughtException', this.handleUncaughtException.bind(this));
  }

  private async handleReady(): Promise<void> {
    logger.info(`Logged in as ${this.user?.tag} (${this.user?.id})`);
    logger.info(`Serving ${this.guilds.cache.size} guilds`);

    await this.registerCommands();
    this.startTasks();
  }

  private async registerCommands(): Promise<void> {
    const commands = [...this.commands.values()].map(cmd => cmd.data);
    const rest = new REST({ version: '10' }).setToken(config.discord.token);

    try {
      logger.info(`Registering ${commands.length} application commands...`);
      await rest.put(Routes.applicationCommands(config.discord.clientId), { body: commands });
      logger.info('Application commands registered globally');
    } catch (error) {
      logger.error('Failed to register commands:', error);
    }
  }

  private startTasks(): void {
    setInterval(() => this.cleanupCooldowns(), 60000);
    setInterval(() => this.cleanupSetupStates(), 300000);
  }

  private cleanupCooldowns(): void {
    const now = Date.now();
    for (const [commandName, users] of this.cooldowns) {
      for (const [userId, expires] of users) {
        if (expires < now) users.delete(userId);
      }
      if (users.size === 0) this.cooldowns.delete(commandName);
    }
  }

  private cleanupSetupStates(): void {
    const now = Date.now();
    for (const [userId, state] of this.setupStates) {
      if (state.messageId && state.channelId) {
        // Clean up old setup states (older than 10 minutes)
        const channel = this.channels.cache.get(state.channelId);
        if (channel && channel.type === 0) { // GuildText
          const message = channel.messages.cache.get(state.messageId);
          if (!message || now - message.createdTimestamp > 600000) {
            this.setupStates.delete(userId);
          }
        }
      }
    }
  }

  private async handleInteraction(interaction: any): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleSlashCommand(interaction);
      } else if (interaction.isButton()) {
        await this.handleButton(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await this.handleSelectMenu(interaction);
      } else if (interaction.isModalSubmit()) {
        await this.handleModal(interaction);
      } else if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
      }
    } catch (error) {
      logger.error('Interaction error:', error);
      await this.sendErrorReply(interaction, 'An error occurred while processing this interaction.');
    }
  }

  private async handleSlashCommand(interaction: any): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (!command) return;

    const permissionCheck = await this.checkPermissions(interaction.member, command.data.permissionLevel ?? 0);
    if (!permissionCheck.hasPermission) {
      await interaction.reply({ content: `❌ You need ${permissionCheck.level} permission level to use this command.`, ephemeral: true });
      return;
    }

    if (!this.checkCooldown(interaction.commandName, interaction.user.id, command.data.cooldown)) {
      await interaction.reply({ content: '⏳ Command on cooldown. Please wait.', ephemeral: true });
      return;
    }

    try {
      await command.execute(interaction, this);
    } catch (error) {
      logger.error(`Error executing command ${interaction.commandName}:`, error);
      await this.sendErrorReply(interaction, 'An error occurred while executing this command.');
    }
  }

  private async handleButton(interaction: any): Promise<void> {
    const [prefix, ...parts] = interaction.customId.split('_');
    const action = `${prefix}_${parts[0]}`;

    for (const command of this.commands.values()) {
      if (command.handleButton) {
        try {
          await command.handleButton(interaction, this, action, parts.join('_'));
        } catch (error) {
          logger.error(`Button handler error for ${action}:`, error);
        }
      }
    }
  }

  private async handleSelectMenu(interaction: any): Promise<void> {
    const [prefix, ...parts] = interaction.customId.split('_');
    const action = `${prefix}_${parts[0]}`;

    for (const command of this.commands.values()) {
      if (command.handleSelectMenu) {
        try {
          await command.handleSelectMenu(interaction, this, action, parts.join('_'));
        } catch (error) {
          logger.error(`Select menu handler error for ${action}:`, error);
        }
      }
    }
  }

  private async handleModal(interaction: any): Promise<void> {
    const [prefix, ...parts] = interaction.customId.split('_');
    const action = `${prefix}_${parts[0]}`;

    for (const command of this.commands.values()) {
      if (command.handleModal) {
        try {
          await command.handleModal(interaction, this, action, parts.join('_'));
        } catch (error) {
          logger.error(`Modal handler error for ${action}:`, error);
        }
      }
    }
  }

  private async handleAutocomplete(interaction: any): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (command?.autocomplete) {
      try {
        await command.autocomplete(interaction, this);
      } catch (error) {
        logger.error(`Autocomplete error for ${interaction.commandName}:`, error);
      }
    }
  }

  private async handleMessage(message: any): Promise<void> {
    if (message.author.bot || !message.guild) return;

    // Handle snipe/quote storage
    await this.handleSnipeStorage(message);

    // Handle prefix commands
    await this.handlePrefixCommand(message);
  }

  private async handleSnipeStorage(message: any): Promise<void> {
    // Implemented in snipe handler
  }

  private async handlePrefixCommand(message: any): Promise<void> {
    if (!message.guild) return;
    
    const guildConfig = await this.getGuildConfig(message.guild.id);
    const prefix = guildConfig?.prefix ?? config.prefix;

    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = this.prefixCommands.get(commandName) ?? 
      [...this.prefixCommands.values()].find(c => c.aliases?.includes(commandName));
    
    if (!command) return;

    const permissionCheck = await this.checkPermissions(message.member, command.permissionLevel ?? 0);
    if (!permissionCheck.hasPermission) {
      await message.reply({ content: `❌ You need ${permissionCheck.level} permission level to use this command.` });
      return;
    }

    if (!this.checkCooldown(commandName, message.author.id, command.cooldown)) {
      await message.reply('⏳ Command on cooldown. Please wait.');
      return;
    }

    try {
      await command.execute(message, args, this);
    } catch (error) {
      logger.error(`Error executing prefix command ${commandName}:`, error);
      await message.reply('An error occurred while executing this command.');
    }
  }

  private async handleGuildMemberAdd(member: any): Promise<void> {
    // Implemented in welcome handler
  }

  private async handleGuildMemberRemove(member: any): Promise<void> {
    // Implemented in welcome handler
  }

  private async handleMessageDelete(message: any): Promise<void> {
    // Implemented in snipe handler
  }

  private async handleMessageUpdate(oldMessage: any, newMessage: any): Promise<void> {
    // Implemented in snipe handler
  }

  private async handleGuildBanAdd(ban: any): Promise<void> {
    // Implemented in mod handler
  }

  private async handleGuildBanRemove(ban: any): Promise<void> {
    // Implemented in mod handler
  }

  private async handleChannelCreate(channel: any): Promise<void> {
    // Implemented in mod handler
  }

  private async handleChannelDelete(channel: any): Promise<void> {
    // Implemented in mod handler
  }

  private async handleChannelUpdate(oldChannel: any, newChannel: any): Promise<void> {
    // Implemented in mod handler
  }

private async checkPermissions(member: any, requiredLevel: number): Promise<{ hasPermission: boolean; level: number }> {
    const { hasPermission } = await import('../utils/permissions.js');
    const result = await hasPermission(member, requiredLevel as any);
    return { hasPermission: result.hasPermission, level: result.level };
  }

  private checkCooldown(commandName: string, userId: string, cooldown?: number): boolean {
    if (!cooldown) return true;
    const now = Date.now();
    const timestamps = this.cooldowns.get(commandName) ?? new Collection();
    const expirationTime = timestamps.get(userId) ?? 0;

    if (now < expirationTime) return false;

    timestamps.set(userId, now + cooldown);
    this.cooldowns.set(commandName, timestamps);
    return true;
  }

  private async sendErrorReply(interaction: any, message: string): Promise<void> {
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

  private async getGuildConfig(guildId: string) {
    const { getGuildConfig } = await import('../utils/database.js');
    return getGuildConfig(guildId);
  }

  private handleError(error: Error): void {
    logger.error('Discord client error:', error);
  }

  private handleWarn(warning: string): void {
    logger.warn('Discord client warning:', warning);
  }

  private handleUnhandledRejection(reason: any): void {
    logger.error('Unhandled Rejection:', reason);
  }

  private handleUncaughtException(error: Error): void {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  }
}

export const client = new BotClient();