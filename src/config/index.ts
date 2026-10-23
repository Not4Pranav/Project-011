import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

interface EconomyConfig {
  startingBalance: number;
  dailyReward: number;
  dailyStreakBonus: number;
  workRewardMin: number;
  workRewardMax: number;
  workCooldown: number;
}

interface GamesConfig {
  slotsCost: number;
  coinflipMinBet: number;
  rpsMinBet: number;
}

interface WelcomeConfig {
  fakeUserAccountAgeDays: number;
  fakeUserCheckEnabled: boolean;
}

interface TicketsConfig {
  transcriptFormat: 'html' | 'text';
  closeDelay: number;
}

interface PermissionsConfig {
  levels: {
    moderator: number;
    admin: number;
    owner: number;
  };
}

export interface Config {
  prefix: string;
  language: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxTicketPanels: number;
  maxWarningsBeforeAction: number;
  defaultMuteDuration: number;
  economy: EconomyConfig;
  games: GamesConfig;
  welcome: WelcomeConfig;
  tickets: TicketsConfig;
  permissions: PermissionsConfig;
  discord: {
    token: string;
    clientId: string;
    clientSecret: string;
  };
  database: {
    url: string;
  };
  ownerIds: string[];
}

function loadConfigJson(): Partial<Config> {
  const configPath = join(process.cwd(), 'src', 'config', 'config.json');
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const content = readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as Partial<Config>;
  } catch {
    return {};
  }
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be an integer`);
  }
  return parsed;
}

function getEnvBool(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.toLowerCase() === 'true';
}

const jsonConfig = loadConfigJson();

export const config: Config = {
  prefix: getEnv('BOT_PREFIX', jsonConfig.prefix ?? '!'),
  language: jsonConfig.language ?? 'en',
  logLevel: (getEnv('LOG_LEVEL', jsonConfig.logLevel ?? 'info') as Config['logLevel']),
  maxTicketPanels: jsonConfig.maxTicketPanels ?? 5,
  maxWarningsBeforeAction: jsonConfig.maxWarningsBeforeAction ?? 3,
  defaultMuteDuration: jsonConfig.defaultMuteDuration ?? 60,
  economy: {
    startingBalance: jsonConfig.economy?.startingBalance ?? 1000,
    dailyReward: jsonConfig.economy?.dailyReward ?? 500,
    dailyStreakBonus: jsonConfig.economy?.dailyStreakBonus ?? 50,
    workRewardMin: jsonConfig.economy?.workRewardMin ?? 100,
    workRewardMax: jsonConfig.economy?.workRewardMax ?? 500,
    workCooldown: jsonConfig.economy?.workCooldown ?? 3600000,
  },
  games: {
    slotsCost: jsonConfig.games?.slotsCost ?? 100,
    coinflipMinBet: jsonConfig.games?.coinflipMinBet ?? 50,
    rpsMinBet: jsonConfig.games?.rpsMinBet ?? 50,
  },
  welcome: {
    fakeUserAccountAgeDays: jsonConfig.welcome?.fakeUserAccountAgeDays ?? 7,
    fakeUserCheckEnabled: jsonConfig.welcome?.fakeUserCheckEnabled ?? true,
  },
  tickets: {
    transcriptFormat: jsonConfig.tickets?.transcriptFormat ?? 'html',
    closeDelay: jsonConfig.tickets?.closeDelay ?? 5000,
  },
  permissions: {
    levels: {
      moderator: jsonConfig.permissions?.levels?.moderator ?? 1,
      admin: jsonConfig.permissions?.levels?.admin ?? 2,
      owner: jsonConfig.permissions?.levels?.owner ?? 3,
    },
  },
  discord: {
    token: getEnv('DISCORD_TOKEN'),
    clientId: getEnv('CLIENT_ID'),
    clientSecret: getEnv('CLIENT_SECRET'),
  },
  database: {
    url: getEnv('DATABASE_URL'),
  },
  ownerIds: getEnv('OWNER_IDS', '').split(',').filter(Boolean),
};

export function validateConfig(): void {
  if (!config.discord.token) throw new Error('DISCORD_TOKEN is required');
  if (!config.discord.clientId) throw new Error('CLIENT_ID is required');
  if (!config.database.url) throw new Error('DATABASE_URL is required');
  if (config.ownerIds.length === 0) {
    console.warn('Warning: OWNER_IDS not set, owner-only commands will not work');
  }
}

export default config;