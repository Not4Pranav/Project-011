export const COLORS = {
  PRIMARY: 0x5865F2,
  SUCCESS: 0x57F287,
  WARNING: 0xFEE75C,
  ERROR: 0xED4245,
  INFO: 0x3498DB,
  MOD: 0xFF6B35,
  TICKET: 0x9B59B6,
  WELCOME: 0x2ECC71,
  GAME: 0xE74C3C,
  VOICE: 0x7289DA,
  UTILITY: 0x95A5A6,
  DEFAULT: 0x2F3136,
} as const;

export const EMOJIS = {
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  TICKET: '🎫',
  CLOSE: '🔒',
  CLAIM: '👤',
  ADD: '➕',
  REMOVE: '➖',
  TRANSCRIPT: '📋',
  REOPEN: '🔓',
  DELETE: '🗑️',
  WELCOME: '👋',
  LEAVE: '👋',
  MOD: '🛡️',
  WARN: '⚠️',
  MUTE: '🔇',
  UNMUTE: '🔊',
  KICK: '👢',
  BAN: '🔨',
  UNBAN: '🔓',
  PURGE: '🧹',
  COINS: '💰',
  XP: '⭐',
  LEVEL: '📈',
  DAILY: '📅',
  WORK: '💼',
  SLOTS: '🎰',
  COINFLIP: '🪙',
  RPS: '✊',
  TRIVIA: '❓',
  HANGMAN: '🎯',
  LEADERBOARD: '🏆',
  SHOP: '🛍️',
  INVENTORY: '🎒',
  APPEAL: '📋',
  SNIPE: '🗑️',
  QUOTE: '💬',
  AVATAR: '🖼️',
  SERVER: '🏠',
  USER: '👤',
  PING: '🏓',
  VOICE: '🔊',
  GIVEAWAY: '🎉',
  SHIELD: '🛡️',
  SETTINGS: '⚙️',
  SEARCH: '🔍',
  ARROW_RIGHT: '▶️',
  ARROW_LEFT: '◀️',
  CHECK: '✔️',
  CROSS: '✖️',
  GAME: '🎮',
  UTILITY: '🔧',
  ROLE: '🎭',
} as const;

export const PERMISSION_LEVELS = {
  EVERYONE: 0,
  MODERATOR: 1,
  ADMIN: 2,
  OWNER: 3,
} as const;

export const TICKET_STATUS = {
  OPEN: 'OPEN',
  CLAIMED: 'CLAIMED',
  CLOSED: 'CLOSED',
  DELETED: 'DELETED',
} as const;

export const CASE_TYPES = {
  WARN: 'WARN',
  MUTE: 'MUTE',
  UNMUTE: 'UNMUTE',
  KICK: 'KICK',
  BAN: 'BAN',
  UNBAN: 'UNBAN',
  TIMEOUT: 'TIMEOUT',
  PURGE: 'PURGE',
} as const;

export const WELCOME_TYPES = {
  WELCOME: 'WELCOME',
  LEAVE: 'LEAVE',
  DM: 'DM',
} as const;

export const LEADERBOARD_TYPES = {
  BALANCE: 'BALANCE',
  XP: 'XP',
  WINS: 'WINS',
  GAMES_PLAYED: 'GAMES_PLAYED',
} as const;

export const CUSTOM_ID_PREFIXES = {
  TICKET_CREATE: 'ticket_create_',
  TICKET_CLOSE: 'ticket_close_',
  TICKET_CLAIM: 'ticket_claim_',
  TICKET_ADD: 'ticket_add_',
  TICKET_REMOVE: 'ticket_remove_',
  TICKET_TRANSCRIPT: 'ticket_transcript_',
  TICKET_REOPEN: 'ticket_reopen_',
  TICKET_DELETE: 'ticket_delete_',
  SETUP_STEP: 'setup_step_',
  SETUP_CONFIRM: 'setup_confirm_',
  SETUP_CANCEL: 'setup_cancel_',
  WELCOME_CONFIG: 'welcome_config_',
  MOD_ACTION: 'mod_action_',
  GAME_ACTION: 'game_action_',
  VOICEMASTER: 'voicemaster_',
  VM_ACTION: 'vm_',
  AUTOMOD: 'automod_',
} as const;

export const AUTOMOD_ACTION_TYPES = {
  BLOCK_MESSAGE: 'BLOCK_MESSAGE',
  TIMEOUT: 'TIMEOUT',
  ALERT: 'ALERT',
  DELETE: 'DELETE',
} as const;

export const AUTOMOD_TRIGGER_TYPES = {
  KEYWORD: 'KEYWORD',
  REGEX: 'REGEX',
  SPAM: 'SPAM',
  MENTION_SPAM: 'MENTION_SPAM',
  LINK: 'LINK',
  INVITE: 'INVITE',
  ATTACHMENT: 'ATTACHMENT',
  EMOJI: 'EMOJI',
  CAPS: 'CAPS',
  NEWLINES: 'NEWLINES',
  ZALGO: 'ZALGO',
} as const;

export const ANTINUKE_ACTION_TYPES = {
  CHANNEL_DELETE: 'CHANNEL_DELETE',
  CHANNEL_CREATE: 'CHANNEL_CREATE',
  CHANNEL_UPDATE: 'CHANNEL_UPDATE',
  ROLE_DELETE: 'ROLE_DELETE',
  ROLE_CREATE: 'ROLE_CREATE',
  ROLE_UPDATE: 'ROLE_UPDATE',
  BAN_ADD: 'BAN_ADD',
  BAN_REMOVE: 'BAN_REMOVE',
  KICK: 'KICK',
  BOT_ADD: 'BOT_ADD',
  WEBHOOK_CREATE: 'WEBHOOK_CREATE',
  EMOJI_DELETE: 'EMOJI_DELETE',
  EMOJI_CREATE: 'EMOJI_CREATE',
  EMOJI_UPDATE: 'EMOJI_UPDATE',
} as const;

export const VM_ACTIONS = {
  LOCK: 'vm_lock',
  UNLOCK: 'vm_unlock',
  GHOST: 'vm_ghost',
  REVEAL: 'vm_reveal',
  CLAIM: 'vm_claim',
  RENAME: 'vm_rename',
  LIMIT: 'vm_limit',
  TRANSFER: 'vm_transfer',
  DELETE: 'vm_delete',
} as const;

export const LIMITS = {
  MAX_TICKET_PANELS: 5,
  MAX_WARNINGS: 10,
  MAX_PURGE: 100,
  MAX_EMBED_FIELDS: 25,
  MAX_EMBED_LENGTH: 6000,
  MAX_EMBED_FIELD_VALUE: 1024,
  MAX_EMBED_FIELD_NAME: 256,
  MAX_EMBED_TITLE: 256,
  MAX_EMBED_DESCRIPTION: 4096,
  MAX_CUSTOM_ID: 100,
  MAX_SELECT_OPTIONS: 25,
  MAX_BUTTONS_PER_ROW: 5,
  MAX_ACTION_ROWS: 5,
  DAILY_COOLDOWN: 86400000,
  WORK_COOLDOWN: 3600000,
  SLOTS_COOLDOWN: 5000,
  COINFLIP_COOLDOWN: 5000,
  RPS_COOLDOWN: 5000,
  TRIVIA_COOLDOWN: 10000,
  HANGMAN_COOLDOWN: 30000,
} as const;

export const REGEX = {
  DISCORD_INVITE: /(discord\.gg|discordapp\.com\/invite)\/([a-zA-Z0-9]+)/,
  USER_MENTION: /^<@!?(\d+)>$/,
  ROLE_MENTION: /^<@&(\d+)>$/,
  CHANNEL_MENTION: /^<#(\d+)>$/,
  EMOJI: /^<a?:[a-zA-Z0-9_]+:(\d+)>$/,
  SNOWFLAKE: /^\d{17,19}$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  URL: /^https?:\/\/.+/,
} as const;

export const DATABASE = {
  CONNECTION_LIMIT: 10,
  QUERY_TIMEOUT: 30000,
  MIGRATION_TIMEOUT: 60000,
} as const;

export const SETUP_STEPS = [
  { id: 'basic', name: 'Basic Configuration', description: 'Prefix, language, log channels' },
  { id: 'permissions', name: 'Permission Roles', description: 'Moderator, admin, owner roles' },
  { id: 'tickets', name: 'Ticket System', description: 'Categories, support roles, panels' },
  { id: 'welcome', name: 'Welcome System', description: 'Messages, auto-role, invite tracking' },
  { id: 'moderation', name: 'Moderation', description: 'Log channels, mute role, DM settings' },
  { id: 'games', name: 'Games & Economy', description: 'Economy, daily rewards, starting balance' },
  { id: 'utility', name: 'Utility Features', description: 'Snipe, quotes, info commands' },
  { id: 'confirm', name: 'Confirmation', description: 'Review and apply all settings' },
] as const;

export const SETUP_STEP_COUNT = SETUP_STEPS.length;

export const INTENTS = [
  'Guilds',
  'GuildMembers',
  'GuildMessages',
  'GuildMessageReactions',
  'GuildVoiceStates',
  'GuildInvites',
  'GuildMessageTyping',
  'DirectMessages',
  'DirectMessageReactions',
  'MessageContent',
  'GuildPresences',
] as const;

export const PARTIALS = [
  'Message',
  'Channel',
  'Reaction',
  'User',
  'GuildMember',
] as const;