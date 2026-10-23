import { EmbedBuilder, Colors, GuildMember, User, Guild, TextChannel, APIEmbedField } from 'discord.js';
import { COLORS, EMOJIS, LIMITS } from './constants.js';

export function createEmbed(options: {
  title?: string;
  description?: string;
  color?: number;
  fields?: APIEmbedField[];
  footer?: { text: string; iconURL?: string };
  thumbnail?: string;
  image?: string;
  author?: { name: string; iconURL?: string; url?: string };
  timestamp?: boolean;
  url?: string;
}): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (options.title) embed.setTitle(options.title);
  if (options.description) embed.setDescription(options.description);
  if (options.color) embed.setColor(options.color);
  else embed.setColor(COLORS.DEFAULT);
  if (options.fields?.length) embed.addFields(options.fields);
  if (options.footer) embed.setFooter(options.footer);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.image) embed.setImage(options.image);
  if (options.author) embed.setAuthor(options.author);
  if (options.timestamp !== false) embed.setTimestamp();
  if (options.url) embed.setURL(options.url);

  return embed;
}

export function successEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.SUCCESS} Success`,
    description,
    color: COLORS.SUCCESS,
  });
}

export function errorEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.ERROR} Error`,
    description,
    color: COLORS.ERROR,
  });
}

export function warningEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.WARNING} Warning`,
    description,
    color: COLORS.WARNING,
  });
}

export function infoEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.INFO} Information`,
    description,
    color: COLORS.INFO,
  });
}

export function loadingEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.LOADING} Loading...`,
    description,
    color: COLORS.INFO,
  });
}

export function modEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.MOD} Moderation`,
    description,
    color: COLORS.MOD,
  });
}

export function ticketEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.TICKET} Ticket`,
    description,
    color: COLORS.TICKET,
  });
}

export function welcomeEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.WELCOME} Welcome`,
    description,
    color: COLORS.WELCOME,
  });
}

export function gameEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.GAME} Game`,
    description,
    color: COLORS.GAME,
  });
}

export function utilityEmbed(description: string, title?: string): EmbedBuilder {
  return createEmbed({
    title: title ?? `${EMOJIS.UTILITY} Utility`,
    description,
    color: COLORS.UTILITY,
  });
}

export function setupEmbed(step: number, total: number, title: string, description: string): EmbedBuilder {
  return createEmbed({
    title: `${EMOJIS.SETTINGS} Setup - Step ${step}/${total}: ${title}`,
    description,
    color: COLORS.PRIMARY,
    footer: { text: `Step ${step} of ${total}` },
  });
}

export function paginatedEmbed(
  title: string,
  items: string[],
  page: number,
  perPage: number = 10,
  color: number = COLORS.DEFAULT
): EmbedBuilder {
  const totalPages = Math.ceil(items.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const pageItems = items.slice(start, end);

  return createEmbed({
    title,
    description: pageItems.join('\n'),
    color,
    footer: { text: `Page ${page}/${totalPages} • ${items.length} items` },
  });
}

export function userInfoEmbed(user: User, member?: GuildMember): EmbedBuilder {
  const fields: APIEmbedField[] = [
    { name: 'ID', value: user.id, inline: true },
    { name: 'Username', value: user.tag, inline: true },
    { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
  ];

  if (member) {
    fields.push(
      { name: 'Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:R>` : 'Unknown', inline: true },
      { name: 'Roles', value: member.roles.cache.size > 1 ? member.roles.cache.map(r => r.toString()).slice(1).join(', ') || 'None' : 'None', inline: false },
      { name: 'Boosting', value: member.premiumSince ? `<t:${Math.floor(member.premiumSince.getTime() / 1000)}:R>` : 'No', inline: true }
    );
  }

  return createEmbed({
    title: `${EMOJIS.USER} User Information`,
    thumbnail: user.displayAvatarURL({ size: 256 }),
    fields,
    color: COLORS.INFO,
  });
}

export function serverInfoEmbed(guild: Guild): EmbedBuilder {
  const fields: APIEmbedField[] = [
    { name: 'ID', value: guild.id, inline: true },
    { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
    { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
    { name: 'Members', value: `${guild.memberCount}`, inline: true },
    { name: 'Channels', value: `${guild.channels.cache.size}`, inline: true },
    { name: 'Roles', value: `${guild.roles.cache.size}`, inline: true },
    { name: 'Boosts', value: `${guild.premiumSubscriptionCount || 0} (Level ${guild.premiumTier})`, inline: true },
    { name: 'Verification', value: guild.verificationLevel.toString(), inline: true },
  ];

  return createEmbed({
    title: `${EMOJIS.SERVER} Server Information`,
    thumbnail: guild.iconURL({ size: 256 }) ?? undefined,
    image: guild.bannerURL({ size: 1024 }) ?? undefined,
    fields,
    color: COLORS.INFO,
  });
}

export function modLogEmbed(
  type: string,
  moderator: User,
  target: User,
  reason: string,
  duration?: string,
  caseId?: string
): EmbedBuilder {
  const fields: APIEmbedField[] = [
    { name: 'Moderator', value: `${moderator.tag} (${moderator.id})`, inline: true },
    { name: 'Target', value: `${target.tag} (${target.id})`, inline: true },
    { name: 'Reason', value: reason, inline: false },
  ];

  if (duration) fields.push({ name: 'Duration', value: duration, inline: true });
  if (caseId) fields.push({ name: 'Case ID', value: caseId, inline: true });

  return createEmbed({
    title: `${EMOJIS.MOD} ${type}`,
    fields,
    color: COLORS.MOD,
    thumbnail: target.displayAvatarURL({ size: 128 }),
  });
}

export function ticketTranscriptEmbed(ticketData: {
  id: string;
  user: User;
  claimedBy?: User;
  status: string;
  type?: string;
  createdAt: Date;
  closedAt?: Date;
  messages: Array<{ user: User; content: string; timestamp: Date; attachments?: string[] }>;
}): EmbedBuilder {
  const messagesText = ticketData.messages
    .map(m => `[${m.timestamp.toISOString()}] ${m.user.tag}: ${m.content}${m.attachments?.length ? ` (${m.attachments.length} attachments)` : ''}`)
    .join('\n');

  const fields: APIEmbedField[] = [
    { name: 'Ticket ID', value: ticketData.id, inline: true },
    { name: 'User', value: `${ticketData.user.tag} (${ticketData.user.id})`, inline: true },
    { name: 'Status', value: ticketData.status, inline: true },
    { name: 'Type', value: ticketData.type ?? 'General', inline: true },
    { name: 'Created', value: `<t:${Math.floor(ticketData.createdAt.getTime() / 1000)}:F>`, inline: true },
    { name: 'Closed', value: ticketData.closedAt ? `<t:${Math.floor(ticketData.closedAt.getTime() / 1000)}:F>` : 'Still open', inline: true },
    { name: 'Claimed By', value: ticketData.claimedBy ? `${ticketData.claimedBy.tag}` : 'Unclaimed', inline: true },
    { name: 'Messages', value: `${ticketData.messages.length}`, inline: true },
  ];

  if (messagesText.length > LIMITS.MAX_EMBED_DESCRIPTION) {
    fields.push({ name: 'Transcript', value: 'Too long for embed. See attached file.', inline: false });
  } else {
    fields.push({ name: 'Transcript', value: messagesText || 'No messages', inline: false });
  }

  return createEmbed({
    title: `${EMOJIS.TRANSCRIPT} Ticket Transcript #${ticketData.id.slice(0, 8)}`,
    fields,
    color: COLORS.TICKET,
  });
}

export function welcomeEmbedCustom(
  member: GuildMember,
  content: string,
  embedData?: Record<string, any>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setDescription(content.replace('{user}', member.toString()).replace('{server}', member.guild.name))
    .setColor(COLORS.WELCOME)
    .setThumbnail(member.displayAvatarURL({ size: 128 }))
    .setTimestamp();

  if (embedData) {
    if (embedData.title) embed.setTitle(embedData.title);
    if (embedData.color) embed.setColor(embedData.color);
    if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
    if (embedData.image) embed.setImage(embedData.image);
    if (embedData.footer) embed.setFooter(embedData.footer);
    if (embedData.fields) embed.addFields(embedData.fields);
  }

  return embed;
}

export function truncate(text: string, maxLength: number = LIMITS.MAX_EMBED_DESCRIPTION): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function formatFields(fields: APIEmbedField[], maxFields: number = LIMITS.MAX_EMBED_FIELDS): APIEmbedField[] {
  return fields.slice(0, maxFields).map(f => ({
    name: truncate(f.name, LIMITS.MAX_EMBED_FIELD_NAME),
    value: truncate(f.value, LIMITS.MAX_EMBED_FIELD_VALUE),
    inline: f.inline,
  }));
}