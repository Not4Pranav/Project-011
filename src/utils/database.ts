import { prisma } from '../database/client.js';
import { GuildConfigData, PermissionRoleData, TicketConfigData, WelcomeConfigData, ModConfigData, GameConfigData } from '../types/index.js';

export async function getOrCreateGuildConfig(guildId: string) {
  return prisma.guildConfig.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
    include: {
      ticketConfig: true,
      welcomeConfig: true,
      modConfig: true,
      gameConfig: true,
      permissions: true,
    },
  });
}

export async function getGuildConfig(guildId: string) {
  return prisma.guildConfig.findUnique({
    where: { guildId },
    include: {
      ticketConfig: { include: { panels: true } },
      welcomeConfig: { include: { messages: true } },
      modConfig: true,
      gameConfig: { include: { users: true } },
      permissions: true,
    },
  });
}

export async function updateGuildConfig(guildId: string, data: Partial<GuildConfigData>) {
  return prisma.guildConfig.update({
    where: { guildId },
    data,
  });
}

export async function setPermissionRoles(guildId: string, roles: PermissionRoleData[]) {
  return prisma.$transaction([
    prisma.permissionRole.deleteMany({ where: { guildId } }),
    prisma.permissionRole.createMany({
      data: roles.map(r => ({ guildId, roleId: r.roleId, level: r.level })),
      skipDuplicates: true,
    }),
  ]);
}

export async function getTicketConfig(guildId: string) {
  return prisma.ticketConfig.findUnique({
    where: { guildId },
    include: { panels: true, tickets: true },
  });
}

export async function createTicketConfig(guildId: string, data: Omit<TicketConfigData, 'panels'>) {
  return prisma.ticketConfig.create({
    data: { guildId, ...data },
  });
}

export async function updateTicketConfig(guildId: string, data: Partial<Omit<TicketConfigData, 'panels'>>) {
  return prisma.ticketConfig.update({
    where: { guildId },
    data,
  });
}

export async function createTicketPanel(configId: string, data: { channelId: string; messageId: string; title: string; description: string; emoji: string; categoryId?: string }) {
  return prisma.ticketPanel.create({
    data: { configId, ...data },
  });
}

export async function getTicketPanels(configId: string) {
  return prisma.ticketPanel.findMany({ where: { configId } });
}

export async function deleteTicketPanel(panelId: string) {
  return prisma.ticketPanel.delete({ where: { id: panelId } });
}

export async function createTicket(configId: string, channelId: string, userId: string, type?: string) {
  return prisma.ticket.create({
    data: { configId, channelId, userId, type },
  });
}

export async function getTicketByChannel(channelId: string) {
  return prisma.ticket.findUnique({ where: { channelId }, include: { messages: true } });
}

export async function getTicketById(ticketId: string) {
  return prisma.ticket.findUnique({ where: { id: ticketId }, include: { messages: true } });
}

export async function updateTicket(ticketId: string, data: { status?: 'OPEN' | 'CLAIMED' | 'CLOSED' | 'DELETED'; claimedBy?: string; closedAt?: Date | null }) {
  return prisma.ticket.update({ where: { id: ticketId }, data });
}

export async function addTicketMessage(ticketId: string, userId: string, content: string, attachments: string[] = []) {
  return prisma.ticketMessage.create({
    data: { ticketId, userId, content, attachments },
  });
}

export async function getTicketMessages(ticketId: string) {
  return prisma.ticketMessage.findMany({ where: { ticketId }, orderBy: { createdAt: 'asc' } });
}

export async function getOpenTickets(guildId: string) {
  const config = await prisma.ticketConfig.findUnique({ where: { guildId } });
  if (!config) return [];
  return prisma.ticket.findMany({
    where: { configId: config.id, status: { in: ['OPEN', 'CLAIMED'] } },
  });
}

export async function getWelcomeConfig(guildId: string) {
  return prisma.welcomeConfig.findUnique({
    where: { guildId },
    include: { messages: true },
  });
}

export async function createWelcomeConfig(guildId: string, data: Omit<WelcomeConfigData, 'messages'>) {
  return prisma.welcomeConfig.create({
    data: { guildId, ...data },
  });
}

export async function updateWelcomeConfig(guildId: string, data: Partial<Omit<WelcomeConfigData, 'messages'>>) {
  return prisma.welcomeConfig.update({
    where: { guildId },
    data,
  });
}

export async function setWelcomeMessages(configId: string, messages: { type: string; content: string; embedData?: any }[]) {
  return prisma.$transaction([
    prisma.welcomeMessage.deleteMany({ where: { configId } }),
    prisma.welcomeMessage.createMany({
      data: messages.map(m => ({ configId, type: m.type as any, content: m.content, embedData: m.embedData })),
    }),
  ]);
}

export async function getWelcomeMessages(configId: string) {
  return prisma.welcomeMessage.findMany({ where: { configId } });
}

export async function getModConfig(guildId: string) {
  return prisma.modConfig.findUnique({
    where: { guildId },
    include: { warnings: true, mutes: true, cases: true },
  });
}

export async function createModConfig(guildId: string, data: ModConfigData) {
  return prisma.modConfig.create({ data: { guildId, ...data } });
}

export async function updateModConfig(guildId: string, data: Partial<ModConfigData>) {
  return prisma.modConfig.update({ where: { guildId }, data });
}

export async function createWarning(configId: string, userId: string, moderatorId: string, reason: string) {
  return prisma.warning.create({ data: { configId, userId, moderatorId, reason } });
}

export async function getWarnings(configId: string, userId?: string) {
  return prisma.warning.findMany({
    where: { configId, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createMute(configId: string, userId: string, moderatorId: string, reason: string, duration?: number) {
  const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000) : null;
  return prisma.mute.create({ data: { configId, userId, moderatorId, reason, duration, expiresAt } });
}

export async function getActiveMute(configId: string, userId: string) {
  return prisma.mute.findFirst({
    where: { configId, userId, active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
  });
}

export async function deactivateMute(muteId: string) {
  return prisma.mute.update({ where: { id: muteId }, data: { active: false } });
}

export async function createModCase(configId: string, data: { type: 'WARN' | 'MUTE' | 'UNMUTE' | 'KICK' | 'BAN' | 'UNBAN' | 'TIMEOUT' | 'PURGE'; userId: string; moderatorId: string; reason: string; duration?: number }) {
  return prisma.modCase.create({ data: { configId, ...data } });
}

export async function getModCases(configId: string, userId?: string) {
  return prisma.modCase.findMany({
    where: { configId, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getGameConfig(guildId: string) {
  return prisma.gameConfig.findUnique({
    where: { guildId },
    include: { users: true, leaderboards: true },
  });
}

export async function createGameConfig(guildId: string, data: GameConfigData) {
  return prisma.gameConfig.create({ data: { guildId, ...data } });
}

export async function updateGameConfig(guildId: string, data: Partial<GameConfigData>) {
  return prisma.gameConfig.update({ where: { guildId }, data });
}

export async function getOrCreateGameUser(configId: string, userId: string) {
  return prisma.gameUser.upsert({
    where: { configId_userId: { configId, userId } },
    update: {},
    create: { configId, userId },
  });
}

export async function updateGameUser(configId: string, userId: string, data: { balance?: { increment?: number; decrement?: number; set?: number }; xp?: { increment?: number; decrement?: number; set?: number }; level?: number; streak?: number; lastDaily?: Date }) {
  return prisma.gameUser.update({ where: { configId_userId: { configId, userId } }, data });
}

export async function addBalance(configId: string, userId: string, amount: number) {
  return prisma.$transaction(async tx => {
    const user = await tx.gameUser.upsert({
      where: { configId_userId: { configId, userId } },
      update: { balance: { increment: amount } },
      create: { configId, userId, balance: amount },
    });
    await tx.leaderboard.upsert({
      where: { configId_type_userId: { configId, type: 'BALANCE', userId } },
      update: { value: { increment: amount } },
      create: { configId, type: 'BALANCE', userId, value: user.balance + amount },
    });
    return user;
  });
}

export async function getLeaderboard(configId: string, type: string, limit: number = 10) {
  return prisma.leaderboard.findMany({
    where: { configId, type: type as any },
    orderBy: { value: 'desc' },
    take: limit,
  });
}

export async function createSnipedMessage(data: { guildId: string; channelId: string; userId: string; content: string; attachments: string[]; embeds?: any }) {
  return prisma.snipedMessage.create({ data });
}

export async function getSnipedMessage(guildId: string, channelId: string) {
  return prisma.snipedMessage.findFirst({
    where: { guildId, channelId },
    orderBy: { deletedAt: 'desc' },
  });
}

export async function deleteOldSnipedMessages(guildId: string, maxAge: number = 24 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAge);
  return prisma.snipedMessage.deleteMany({ where: { guildId, deletedAt: { lt: cutoff } } });
}

export async function createQuote(data: { guildId: string; messageId: string; userId: string; content: string }) {
  return prisma.quote.create({ data });
}

export async function getQuotes(guildId: string, userId?: string) {
  return prisma.quote.findMany({
    where: { guildId, ...(userId ? { userId } : {}) },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getQuoteByMessageId(messageId: string) {
  return prisma.quote.findUnique({ where: { messageId } });
}

export async function createAppeal(data: { configId: string; caseId: string; userId: string; reason: string }) {
  return prisma.appeal.create({ data });
}

export async function getAppeals(configId: string, userId: string, caseId: string) {
  return prisma.appeal.findMany({ where: { configId, userId, caseId } });
}

export async function getAppealById(configId: string, appealId: string) {
  return prisma.appeal.findFirst({ where: { configId, id: appealId } });
}

export async function updateAppeal(appealId: string, data: { status: 'PENDING' | 'APPROVED' | 'DENIED'; reviewedBy: string; reviewedAt: Date }) {
  return prisma.appeal.update({ where: { id: appealId }, data });
}