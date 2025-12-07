import { GuildMember, User } from 'discord.js';
import { env } from '../config/environment.js';

export class SecurityManager {
  private static instance: SecurityManager;
  private ownerIds: Set<string>;

  private constructor() {
    this.ownerIds = new Set(
      env.botOwners ? env.botOwners.split(',').map(id => id.trim()) : []
    );
  }

  public static getInstance(): SecurityManager {
    if (!SecurityManager.instance) {
      SecurityManager.instance = new SecurityManager();
    }
    return SecurityManager.instance;
  }

  /**
   * Check if user is a bot owner
   */
  public isOwner(userId: string): boolean {
    return this.ownerIds.has(userId);
  }

  /**
   * Check if user can perform moderation actions on target
   */
  public canModerate(executor: GuildMember, target: GuildMember): boolean {
    if (executor.id === target.id) return false;

    if (target.id === target.guild.ownerId) return false;

    if (target.roles.highest.position >= executor.roles.highest.position) {
      return false;
    }

    return true;
  }

  /**
   * Sanitize user input to prevent injection attacks
   */
  public sanitizeInput(input: string, maxLength: number = 2000): string {
    let sanitized = input.trim();

    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    sanitized = sanitized.replace(/\0/g, '');

    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    return sanitized;
  }

  /**
   * Validate URL to prevent malicious links
   */
  public isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);

      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      const hostname = urlObj.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate emoji (prevent invalid emoji that could crash clients)
   */
  public isValidEmoji(emoji: string): boolean {
    const customEmojiRegex = /^<a?:\w+:\d+>$/;

    const unicodeEmojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]$/u;

    return customEmojiRegex.test(emoji) || unicodeEmojiRegex.test(emoji);
  }

  /**
   * Validate Discord ID format
   */
  public isValidDiscordId(id: string): boolean {
    return /^\d{17,19}$/.test(id);
  }

  /**
   * Rate limit check for sensitive operations
   */
  private rateLimits = new Map<string, number[]>();

  public checkRateLimit(
    userId: string,
    action: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): { allowed: boolean; remaining: number; resetAt: number } {
    const key = `${userId}:${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    let attempts = this.rateLimits.get(key) || [];

    attempts = attempts.filter(timestamp => timestamp > windowStart);

    const allowed = attempts.length < maxAttempts;
    const remaining = Math.max(0, maxAttempts - attempts.length);
    const resetAt = attempts.length > 0 ? attempts[0] + windowMs : now + windowMs;

    if (allowed) {
      attempts.push(now);
      this.rateLimits.set(key, attempts);
    }

    return { allowed, remaining, resetAt };
  }

  /**
   * Validate and sanitize configuration values
   */
  public validateConfig(key: string, value: any): { valid: boolean; error?: string } {
    switch (key) {
      case 'xp_min':
      case 'xp_max':
      case 'xp_cooldown':
        if (typeof value !== 'number' || value < 0 || value > 1000) {
          return { valid: false, error: 'Value must be a number between 0 and 1000' };
        }
        break;

      case 'prefix':
        if (typeof value !== 'string' || value.length > 5) {
          return { valid: false, error: 'Prefix must be 1-5 characters' };
        }
        break;

      case 'welcome_message':
      case 'goodbye_message':
      case 'level_up_message':
        if (typeof value !== 'string' || value.length > 500) {
          return { valid: false, error: 'Message must be less than 500 characters' };
        }
        break;
    }

    return { valid: true };
  }

  /**
   * Cleanup old rate limit entries
   */
  public cleanupRateLimits(): void {
    const now = Date.now();
    const maxAge = 3600000;

    for (const [key, attempts] of this.rateLimits.entries()) {
      const recentAttempts = attempts.filter(timestamp => now - timestamp < maxAge);

      if (recentAttempts.length === 0) {
        this.rateLimits.delete(key);
      } else {
        this.rateLimits.set(key, recentAttempts);
      }
    }
  }
}

setInterval(() => {
  SecurityManager.getInstance().cleanupRateLimits();
}, 300000);

export const security = SecurityManager.getInstance();
