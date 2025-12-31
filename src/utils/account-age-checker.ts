import { GuildMember, User } from 'discord.js';
import { logger } from './logger.js';

export interface AccountAgeResult {
  isAllowed: boolean;
  accountAgeDays: number;
  accountAgeHours: number;
  requiredDays: number;
  createdAt: Date;
}

export class AccountAgeChecker {
  private static instance: AccountAgeChecker;

  private constructor() {}

  public static getInstance(): AccountAgeChecker {
    if (!AccountAgeChecker.instance) {
      AccountAgeChecker.instance = new AccountAgeChecker();
    }
    return AccountAgeChecker.instance;
  }

  public checkAccountAge(user: User, minAgeDays: number): AccountAgeResult {
    const now = Date.now();
    const createdAt = user.createdAt;
    const accountAgeMs = now - createdAt.getTime();

    const accountAgeDays = Math.floor(accountAgeMs / (1000 * 60 * 60 * 24));
    const accountAgeHours = Math.floor(accountAgeMs / (1000 * 60 * 60));

    const isAllowed = accountAgeDays >= minAgeDays;

    return {
      isAllowed,
      accountAgeDays,
      accountAgeHours,
      requiredDays: minAgeDays,
      createdAt
    };
  }

  public checkMember(member: GuildMember, minAgeDays: number): AccountAgeResult {
    return this.checkAccountAge(member.user, minAgeDays);
  }

  public formatAccountAge(accountAgeDays: number): string {
    if (accountAgeDays < 1) {
      const hours = Math.floor(accountAgeDays * 24);
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    if (accountAgeDays < 30) {
      return `${accountAgeDays} day${accountAgeDays !== 1 ? 's' : ''}`;
    }

    const months = Math.floor(accountAgeDays / 30);
    const days = accountAgeDays % 30;

    if (days === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }

    return `${months} month${months !== 1 ? 's' : ''}, ${days} day${days !== 1 ? 's' : ''}`;
  }

  public getAccountAgeRisk(accountAgeDays: number): 'high' | 'medium' | 'low' | 'safe' {
    if (accountAgeDays < 1) return 'high';
    if (accountAgeDays < 7) return 'medium';
    if (accountAgeDays < 30) return 'low';
    return 'safe';
  }

  public async sendAccountAgeDM(member: GuildMember, requiredDays: number, accountAgeDays: number): Promise<boolean> {
    try {
      await member.send({
        content: `⚠️ **Account Age Requirement**\n\n` +
          `You were removed from **${member.guild.name}** because your account does not meet the minimum age requirement.\n\n` +
          `**Required:** ${requiredDays} day${requiredDays !== 1 ? 's' : ''}\n` +
          `**Your Account Age:** ${this.formatAccountAge(accountAgeDays)}\n\n` +
          `You may rejoin once your account is at least ${requiredDays} day${requiredDays !== 1 ? 's' : ''} old.\n` +
          `Account created: <t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`
      });
      return true;
    } catch (error) {
      logger.warn(`Could not DM user ${member.user.tag} about account age requirement`);
      return false;
    }
  }
}

export const accountAgeChecker = AccountAgeChecker.getInstance();
