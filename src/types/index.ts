import { Client, Guild, GuildMember, Role, TextChannel, CategoryChannel, Interaction, ChatInputCommandInteraction, Message, User } from 'discord.js';

export type PermissionLevel = 0 | 1 | 2 | 3;

export interface PermissionCheckResult {
  hasPermission: boolean;
  level: PermissionLevel;
  reason?: string;
}

export interface CommandOptions {
  name: string;
  description: string;
  permissionLevel?: PermissionLevel;
  cooldown?: number;
  options?: any[];
  subcommands?: SubcommandOptions[];
}

export interface SubcommandOptions {
  name: string;
  description: string;
  options?: any[];
}

export interface Command {
  data: CommandOptions;
  execute: (interaction: ChatInputCommandInteraction, client: BotClient) => Promise<void>;
  autocomplete?: (interaction: Interaction, client: BotClient) => Promise<void>;
  handleButton?: (interaction: any, client: BotClient, action: string, data: string) => Promise<void>;
  handleSelectMenu?: (interaction: any, client: BotClient, action: string, data: string) => Promise<void>;
  handleModal?: (interaction: any, client: BotClient, action: string, data: string) => Promise<void>;
}

export interface PrefixCommand {
  name: string;
  aliases?: string[];
  description: string;
  permissionLevel?: PermissionLevel;
  cooldown?: number;
  usage?: string;
  execute: (message: Message, args: string[], client: BotClient) => Promise<void>;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<void>;
}

export interface SetupState {
  step: number;
  data: Record<string, any>;
  messageId?: string;
  channelId?: string;
}

export interface TicketPanelData {
  channelId: string;
  title: string;
  description: string;
  emoji: string;
  categoryId?: string;
}

export interface WelcomeMessageData {
  type: 'WELCOME' | 'LEAVE' | 'DM';
  content: string;
  embedData?: Record<string, any>;
}

export interface ModCaseData {
  type: 'WARN' | 'MUTE' | 'UNMUTE' | 'KICK' | 'BAN' | 'UNBAN' | 'TIMEOUT' | 'PURGE';
  userId: string;
  moderatorId: string;
  reason: string;
  duration?: number;
}

export interface GameUserData {
  userId: string;
  balance: number;
  xp: number;
  level: number;
  streak: number;
  lastDaily?: Date;
}

export interface SnipedMessageData {
  guildId: string;
  channelId: string;
  userId: string;
  content: string;
  attachments: string[];
  embeds?: any[];
  deletedAt: Date;
}

export interface QuoteData {
  guildId: string;
  messageId: string;
  userId: string;
  content: string;
}

declare module 'discord.js' {
  interface Client {
    commands: Map<string, Command>;
    prefixCommands: Map<string, PrefixCommand>;
    cooldowns: Map<string, Map<string, number>>;
    setupStates: Map<string, SetupState>;
    ticketPanels: Map<string, TicketPanelData>;
  }
}

export interface BotClient extends Client {
  commands: Map<string, Command>;
  prefixCommands: Map<string, PrefixCommand>;
  cooldowns: Map<string, Map<string, number>>;
  setupStates: Map<string, SetupState>;
  ticketPanels: Map<string, TicketPanelData>;
}

export interface ExtendedClient extends BotClient {}

export interface GuildConfigData {
  prefix: string;
  language: string;
  logChannelId?: string;
  modLogChannelId?: string;
}

export interface PermissionRoleData {
  roleId: string;
  level: PermissionLevel;
}

export interface TicketConfigData {
  categoryId?: string;
  logChannelId?: string;
  supportRoleId?: string;
  transcriptChannelId?: string;
  panels: TicketPanelData[];
}

export interface WelcomeConfigData {
  enabled: boolean;
  channelId?: string;
  dmEnabled: boolean;
  dmMessage?: string;
  roleId?: string;
  leaveChannelId?: string;
  leaveMessage?: string;
  inviteTracking: boolean;
  fakeUserCheck: boolean;
  messages: WelcomeMessageData[];
}

export interface ModConfigData {
  logChannelId?: string;
  dmOnAction: boolean;
  muteRoleId?: string;
}

export interface GameConfigData {
  economyEnabled: boolean;
}