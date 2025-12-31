import { Message, GuildMember } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';
import { PROFANITY_PRESETS } from './profanity-list.js';
import { t } from './i18n.js';
import { areMessagesSimilar } from './similarity.js';
import { phishingDetector } from './phishing-detector.js';

interface SpamTracker {
  messages: number[];
  lastCleanup: number;
}

interface MessageHistory {
  content: string;
  timestamp: number;
}

const spamTracking = new Map<string, SpamTracker>();
const messageHistory = new Map<string, MessageHistory[]>();
const SPAM_CLEANUP_INTERVAL = 60000;
const MESSAGE_HISTORY_LIMIT = 10;
const MESSAGE_HISTORY_WINDOW = 30000;

let automodCleanupInterval: NodeJS.Timeout | null = null;

function startAutomodCleanup() {
  if (automodCleanupInterval) return;

  automodCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, tracker] of spamTracking.entries()) {
      if (now - tracker.lastCleanup > SPAM_CLEANUP_INTERVAL) {
        spamTracking.delete(key);
      }
    }
    for (const [key, history] of messageHistory.entries()) {
      const filtered = history.filter(msg => now - msg.timestamp < MESSAGE_HISTORY_WINDOW);
      if (filtered.length === 0) {
        messageHistory.delete(key);
      } else {
        messageHistory.set(key, filtered);
      }
    }
  }, SPAM_CLEANUP_INTERVAL);
}

export function stopAutomodCleanup() {
  if (automodCleanupInterval) {
    clearInterval(automodCleanupInterval);
    automodCleanupInterval = null;
  }
  spamTracking.clear();
  messageHistory.clear();
}

startAutomodCleanup();

export class AutoModerator {
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
  }

  public async checkMessage(message: Message): Promise<boolean> {
    if (!message.guild || message.author.bot) return false;

    const settings = this.db.getAutomodSettings(message.guild.id) as any;
    if (!settings) return false;

    const member = message.member as GuildMember;
    if (member.permissions.has('Administrator')) return false;

    if (settings.exempt_roles) {
      const exemptRoles = settings.exempt_roles.split(',').map((r: string) => r.trim()).filter((r: string) => r.length > 0);
      if (exemptRoles.length > 0 && member.roles.cache.some(role => exemptRoles.includes(role.id))) {
        return false;
      }
    }

    if (settings.exempt_channels) {
      const exemptChannels = settings.exempt_channels.split(',').map((c: string) => c.trim()).filter((c: string) => c.length > 0);
      if (exemptChannels.length > 0 && exemptChannels.includes(message.channel.id)) {
        return false;
      }
    }

    let violated = false;

    if (settings.spam_enabled && await this.checkSpam(message, settings)) {
      violated = true;
    }

    if (settings.spam_similarity_enabled && await this.checkSimilarMessages(message, settings)) {
      violated = true;
    }

    if (!violated && await this.checkCustomFilters(message, settings)) {
      violated = true;
    }

    if (settings.links_enabled && await this.checkLinks(message, settings)) {
      violated = true;
    }

    if (settings.caps_enabled && await this.checkCaps(message, settings)) {
      violated = true;
    }

    if (settings.mentions_enabled && await this.checkMentions(message, settings)) {
      violated = true;
    }

    if (settings.profanity_enabled && await this.checkProfanity(message, settings)) {
      violated = true;
    }

    if (settings.invites_enabled && await this.checkInvites(message, settings)) {
      violated = true;
    }

    if (settings.phishing_enabled && await this.checkPhishing(message, settings)) {
      violated = true;
    }

    return violated;
  }

  private async checkSpam(message: Message, settings: any): Promise<boolean> {
    const key = `${message.guild!.id}-${message.author.id}`;
    const now = Date.now();
    const guildConfig = this.db.getGuild(message.guild!.id) as any;
    const threshold = guildConfig?.automod_spam_count || settings.spam_threshold || 5;
    const interval = ((guildConfig?.automod_spam_interval || settings.spam_interval || 5) * 1000);

    let tracker = spamTracking.get(key);
    if (!tracker) {
      tracker = { messages: [], lastCleanup: now };
      spamTracking.set(key, tracker);
    }

    tracker.messages = tracker.messages.filter(timestamp => now - timestamp < interval);
    tracker.messages.push(now);
    tracker.lastCleanup = now;

    if (tracker.messages.length >= threshold) {
      await this.takeAction(message, 'spam', settings.action);
      tracker.messages = [];
      return true;
    }

    return false;
  }

  private async checkLinks(message: Message, settings: any): Promise<boolean> {
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/gi;
    const urls = message.content.match(urlRegex);

    if (!urls) return false;

    const guildConfig = this.db.getGuild(message.guild!.id) as any;
    const allowedLinks = guildConfig?.automod_allowed_links || settings.links_whitelist || '';

    const whitelist = allowedLinks.includes('\n')
      ? allowedLinks.split('\n').map((d: string) => d.trim()).filter((d: string) => d.length > 0)
      : allowedLinks.split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 0);

    if (whitelist.length === 0) {
      await this.takeAction(message, 'links', settings.action);
      return true;
    }

    for (const url of urls) {
      const isWhitelisted = whitelist.some((domain: string) => url.includes(domain));
      if (!isWhitelisted) {
        await this.takeAction(message, 'links', settings.action);
        return true;
      }
    }

    return false;
  }

  private async checkCaps(message: Message, settings: any): Promise<boolean> {
    const guildConfig = this.db.getGuild(message.guild!.id) as any;
    const minLength = settings.caps_min_length || guildConfig?.automod_caps_min_length || 10;

    if (message.content.length < minLength) return false;

    const capsCount = (message.content.match(/[A-Z]/g) || []).length;
    const totalLetters = (message.content.match(/[A-Za-z]/g) || []).length;

    if (totalLetters === 0) return false;

    const capsPercentage = (capsCount / totalLetters) * 100;
    const threshold = settings.caps_threshold || guildConfig?.automod_caps_percentage || 70;

    if (capsPercentage >= threshold) {
      await this.takeAction(message, 'caps', settings.action);
      return true;
    }

    return false;
  }

  private async checkMentions(message: Message, settings: any): Promise<boolean> {
    const mentionCount = message.mentions.users.size + message.mentions.roles.size;
    const guildConfig = this.db.getGuild(message.guild!.id) as any;
    const threshold = guildConfig?.automod_max_mentions || settings.mentions_threshold || 5;

    if (mentionCount >= threshold) {
      await this.takeAction(message, 'mentions', settings.action);
      return true;
    }

    return false;
  }

  private async checkProfanity(message: Message, settings: any): Promise<boolean> {
    const guildConfig = this.db.getGuild(message.guild!.id) as any;
    const preset = settings.profanity_preset || guildConfig?.automod_profanity_preset || 'moderate';
    const customList = settings.profanity_list || guildConfig?.automod_profanity_list || '';
    const useWordBoundaries = settings.profanity_use_word_boundaries !== undefined
      ? settings.profanity_use_word_boundaries
      : true;

    let words: string[] = [];

    if (preset && preset !== 'off' && PROFANITY_PRESETS[preset as keyof typeof PROFANITY_PRESETS]) {
      const presetWords = PROFANITY_PRESETS[preset as keyof typeof PROFANITY_PRESETS]
        .toLowerCase()
        .split(',')
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 0);
      words.push(...presetWords);
    }

    if (customList && customList.trim().length > 0) {
      const customWords = customList
        .toLowerCase()
        .split('\n')
        .map((w: string) => w.trim())
        .filter((w: string) => w.length > 0);
      words.push(...customWords);
    }

    if (words.length === 0) return false;

    const content = message.content.toLowerCase();

    for (const word of words) {
      if (useWordBoundaries) {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
        if (regex.test(content)) {
          await this.takeAction(message, 'profanity', settings.action);
          return true;
        }
      } else {
        if (content.includes(word)) {
          await this.takeAction(message, 'profanity', settings.action);
          return true;
        }
      }
    }

    return false;
  }

  private async checkInvites(message: Message, settings: any): Promise<boolean> {
    const inviteRegex = /(discord\.gg\/[a-zA-Z0-9_-]+|discord\.com\/invite\/[a-zA-Z0-9_-]+|discordapp\.com\/invite\/[a-zA-Z0-9_-]+|discord\.new\/[a-zA-Z0-9_-]+)/gi;
    const invites = message.content.match(inviteRegex);

    if (!invites) return false;

    const guildConfig = this.db.getGuild(message.guild!.id) as any;
    const allowedServerIds = settings.invites_allowlist || guildConfig?.automod_allow_invites_list || '';

    const allowedServers = allowedServerIds.includes('\n')
      ? allowedServerIds.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
      : allowedServerIds.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

    for (const invite of invites) {
      try {
        const code = invite.split('/').pop();
        if (!code) continue;

        const inviteData = await message.client.fetchInvite(code);
        const inviteGuildId = inviteData.guild?.id;

        if (inviteGuildId) {
          if (allowedServers.includes(inviteGuildId)) {
            continue;
          }

          if (settings.invites_allow_own && inviteGuildId === message.guild!.id) {
            continue;
          }
        }

        await this.takeAction(message, 'invites', settings.action);
        return true;
      } catch (error) {
        logger.warn(`Failed to fetch invite data, blocking invite: ${error}`);
        await this.takeAction(message, 'invites', settings.action);
        return true;
      }
    }

    return false;
  }

  private async checkSimilarMessages(message: Message, settings: any): Promise<boolean> {
    const key = `${message.guild!.id}-${message.author.id}`;
    const now = Date.now();
    const threshold = settings.spam_similarity_threshold || 80;

    let history = messageHistory.get(key) || [];
    history = history.filter(msg => now - msg.timestamp < MESSAGE_HISTORY_WINDOW);

    for (const historicMsg of history) {
      if (areMessagesSimilar(message.content, historicMsg.content, threshold)) {
        await this.takeAction(message, 'spam_similarity', settings.action);
        return true;
      }
    }

    history.push({ content: message.content, timestamp: now });
    if (history.length > MESSAGE_HISTORY_LIMIT) {
      history = history.slice(-MESSAGE_HISTORY_LIMIT);
    }
    messageHistory.set(key, history);

    return false;
  }

  private async checkCustomFilters(message: Message, _settings: any): Promise<boolean> {
    const customFilters = this.db.getEnabledCustomFilters(message.guild!.id) as any[];

    if (!customFilters || customFilters.length === 0) return false;

    for (const filter of customFilters) {
      try {
        const regex = new RegExp(filter.pattern, 'i');
        if (regex.test(message.content)) {
          await this.takeAction(message, `custom_filter:${filter.name}`, filter.action);
          return true;
        }
      } catch (error) {
        logger.warn(`Invalid regex pattern in custom filter "${filter.name}": ${filter.pattern}`);
      }
    }

    return false;
  }

  private async checkPhishing(message: Message, settings: any): Promise<boolean> {
    const result = phishingDetector.checkMessage(message);

    if (result.isPhishing) {
      const violationType = result.domain
        ? `phishing:${result.type}:${result.domain}`
        : `phishing:${result.type}`;

      await this.takeAction(message, violationType, settings.phishing_action || 'warn');
      return true;
    }

    return false;
  }

  private async takeAction(message: Message, violationType: string, action: string): Promise<void> {
    try {
      const botMember = await message.guild!.members.fetchMe();

      if (!botMember.permissions.has('ManageMessages')) {
        logger.warn(`Automod cannot delete messages - missing 'Manage Messages' permission in ${message.guild!.name}`);
        return;
      }

      await message.delete();

      const settings = this.db.getAutomodSettings(message.guild!.id) as any;
      const recentViolations = this.db.getRecentAutomodViolations(message.guild!.id, message.author.id, 3600);

      let actualAction = action;
      let actionDetails = '';

      if (settings?.violations_threshold && recentViolations >= settings.violations_threshold) {
        actualAction = settings.violations_action || 'timeout';
        actionDetails = ` (${recentViolations + 1} violations in 1 hour)`;
      }

      this.db.logAutomodViolation(
        message.guild!.id,
        message.author.id,
        violationType,
        message.content.substring(0, 500),
        actualAction
      );

      const guildData = this.db.getGuild(message.guild!.id) as any;
      const locale = guildData?.locale || 'en';

      const violationMessage = t(`common.automod.violations.${violationType}`, locale);

      if ('send' in message.channel) {
        const warning = await message.channel.send(
          `⚠️ ${message.author}, ${violationMessage}${actionDetails}`
        );

        setTimeout(() => warning.delete().catch(() => {}), 5000);
      }

      const member = message.member as GuildMember;

      if (actualAction === 'warn') {
        if (botMember.permissions.has('ModerateMembers')) {
          this.db.addWarning(
            message.guild!.id,
            message.author.id,
            botMember.id,
            `Auto-mod: ${violationType}`
          );

          try {
            await message.author.send(
              `⚠️ You received a warning in **${message.guild!.name}** for: ${violationType}\nPlease review the server rules.`
            );
          } catch {
          }
        }
      } else if (actualAction === 'timeout') {
        if (!botMember.permissions.has('ModerateMembers')) {
          logger.warn(`Cannot timeout user - missing 'Moderate Members' permission`);
        } else if (member?.moderatable) {
          const duration = (settings?.violations_duration || 300) * 1000;
          await member.timeout(duration, `Auto-mod: ${violationType}${actionDetails}`);

          const caseNumber = this.db.createCase(
            message.guild!.id,
            'Timeout (Auto-mod)',
            message.author.id,
            botMember.id,
            `Auto-mod: ${violationType}`,
            Math.floor(duration / 1000)
          );
          logger.info(`Auto-mod timeout case #${caseNumber} created`);
        }
      } else if (actualAction === 'kick') {
        if (!botMember.permissions.has('KickMembers')) {
          logger.warn(`Cannot kick user - missing 'Kick Members' permission`);
        } else if (member?.kickable) {
          await member.kick(`Auto-mod: ${violationType}${actionDetails}`);

          const caseNumber = this.db.createCase(
            message.guild!.id,
            'Kick (Auto-mod)',
            message.author.id,
            botMember.id,
            `Auto-mod: ${violationType}`
          );
          logger.info(`Auto-mod kick case #${caseNumber} created`);
        }
      } else if (actualAction === 'ban') {
        if (!botMember.permissions.has('BanMembers')) {
          logger.warn(`Cannot ban user - missing 'Ban Members' permission`);
        } else if (member?.bannable) {
          await member.ban({ reason: `Auto-mod: ${violationType}${actionDetails}`, deleteMessageSeconds: 86400 });

          const caseNumber = this.db.createCase(
            message.guild!.id,
            'Ban (Auto-mod)',
            message.author.id,
            botMember.id,
            `Auto-mod: ${violationType}`
          );
          logger.info(`Auto-mod ban case #${caseNumber} created`);
        }
      }

      logger.info(`Auto-mod action taken: ${actualAction} for ${violationType} by ${message.author.tag} in ${message.guild!.name}`);
    } catch (error) {
      logger.error(`Failed to take auto-mod action for ${violationType}`, error);
    }
  }
}

export const autoModerator = new AutoModerator();
