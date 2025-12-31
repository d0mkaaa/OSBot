import { GuildMember, User } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export interface AltDetectionResult {
  isSuspicious: boolean;
  score: number;
  flags: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  details: {
    accountAgeDays: number;
    hasDefaultAvatar: boolean;
    usernamePattern: string | null;
    joinedDuringRaid: boolean;
    rapidInviteJoins: boolean;
    similarUsernames: number;
  };
}

export class AltDetector {
  private static instance: AltDetector;
  private db: DatabaseManager;
  private recentJoins: Map<string, { userId: string; timestamp: number; inviteCode: string | null }[]>;

  private constructor() {
    this.db = DatabaseManager.getInstance();
    this.recentJoins = new Map();

    setInterval(() => {
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);

      for (const [guildId, joins] of this.recentJoins.entries()) {
        const filtered = joins.filter(j => j.timestamp > fiveMinutesAgo);
        if (filtered.length === 0) {
          this.recentJoins.delete(guildId);
        } else {
          this.recentJoins.set(guildId, filtered);
        }
      }
    }, 60000);
  }

  public static getInstance(): AltDetector {
    if (!AltDetector.instance) {
      AltDetector.instance = new AltDetector();
    }
    return AltDetector.instance;
  }

  public async checkMember(member: GuildMember, sensitivity: number = 3): Promise<AltDetectionResult> {
    const flags: string[] = [];
    let score = 0;

    const now = Date.now();
    const accountAge = now - member.user.createdTimestamp;
    const accountAgeDays = Math.floor(accountAge / (1000 * 60 * 60 * 24));

    if (accountAgeDays < 1) {
      flags.push('account_age_less_than_1_day');
      score += 30;
    } else if (accountAgeDays < 7) {
      flags.push('account_age_less_than_7_days');
      score += 20;
    } else if (accountAgeDays < 30) {
      flags.push('account_age_less_than_30_days');
      score += 10;
    }

    const hasDefaultAvatar = member.user.avatar === null;
    if (hasDefaultAvatar) {
      flags.push('default_avatar');
      score += 15;
    }

    const usernamePattern = this.detectSuspiciousUsername(member.user.username);
    if (usernamePattern) {
      flags.push(`suspicious_username_${usernamePattern}`);
      score += 20;
    }

    const guildData = this.db.getGuild(member.guild.id) as any;
    const joinedDuringRaid = guildData?.raid_lockdown_active === 1;
    if (joinedDuringRaid) {
      flags.push('joined_during_raid');
      score += 25;
    }

    const inviteInfo = this.db.getMemberInvite(member.guild.id, member.id) as any;
    const inviteCode = inviteInfo?.invite_code || null;

    this.trackJoin(member.guild.id, member.id, inviteCode);

    const rapidInviteJoins = this.checkRapidInviteJoins(member.guild.id, inviteCode);
    if (rapidInviteJoins) {
      flags.push('rapid_invite_joins');
      score += 20;
    }

    const similarUsernames = await this.checkSimilarUsernames(member);
    if (similarUsernames > 2) {
      flags.push('multiple_similar_usernames');
      score += 15;
    }

    if (accountAgeDays < 3 && hasDefaultAvatar) {
      flags.push('new_account_default_avatar_combo');
      score += 15;
    }

    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= 70) riskLevel = 'critical';
    else if (score >= 50) riskLevel = 'high';
    else if (score >= 30) riskLevel = 'medium';
    else riskLevel = 'low';

    const threshold = this.getSensitivityThreshold(sensitivity);
    const isSuspicious = score >= threshold;

    if (isSuspicious) {
      this.db.saveAltDetectionScore(member.guild.id, member.id, score, flags.join(','));
      logger.info(`Alt detection flagged ${member.user.tag} in ${member.guild.name}: score=${score}, flags=${flags.join(', ')}`);
    }

    return {
      isSuspicious,
      score,
      flags,
      riskLevel,
      details: {
        accountAgeDays,
        hasDefaultAvatar,
        usernamePattern,
        joinedDuringRaid,
        rapidInviteJoins,
        similarUsernames
      }
    };
  }

  private detectSuspiciousUsername(username: string): string | null {
    const patterns = [
      { name: 'random_digits', regex: /^[a-z]+\d{4,}$/i },
      { name: 'only_digits', regex: /^\d+$/ },
      { name: 'random_chars', regex: /^[a-z]{1,3}\d{3,}[a-z]{1,3}$/i },
      { name: 'unicode_chars', regex: /[^\x00-\x7F]+/ },
      { name: 'repeated_chars', regex: /(.)\1{4,}/ },
      { name: 'discord_impersonation', regex: /disc[o0]rd|nitro|staff|admin|mod/i }
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(username)) {
        return pattern.name;
      }
    }

    return null;
  }

  private trackJoin(guildId: string, userId: string, inviteCode: string | null): void {
    let joins = this.recentJoins.get(guildId) || [];
    joins.push({
      userId,
      timestamp: Date.now(),
      inviteCode
    });
    this.recentJoins.set(guildId, joins);
  }

  private checkRapidInviteJoins(guildId: string, inviteCode: string | null): boolean {
    if (!inviteCode) return false;

    const joins = this.recentJoins.get(guildId) || [];
    const now = Date.now();
    const twoMinutesAgo = now - (2 * 60 * 1000);

    const sameInviteJoins = joins.filter(j =>
      j.inviteCode === inviteCode && j.timestamp > twoMinutesAgo
    );

    return sameInviteJoins.length >= 3;
  }

  private async checkSimilarUsernames(member: GuildMember): Promise<number> {
    try {
      const members = await member.guild.members.fetch();
      const recentMembers = members.filter(m =>
        m.id !== member.id &&
        (Date.now() - m.joinedTimestamp!) < (24 * 60 * 60 * 1000)
      );

      let similarCount = 0;
      const username = member.user.username.toLowerCase();

      for (const [_, otherMember] of recentMembers) {
        const otherUsername = otherMember.user.username.toLowerCase();
        const similarity = this.calculateSimilarity(username, otherUsername);

        if (similarity > 0.7) {
          similarCount++;
        }
      }

      return similarCount;
    } catch (error) {
      logger.error('Error checking similar usernames:', error);
      return 0;
    }
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private getEditDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private getSensitivityThreshold(sensitivity: number): number {
    const thresholds: { [key: number]: number } = {
      1: 70,
      2: 50,
      3: 35,
      4: 25,
      5: 15
    };

    return thresholds[sensitivity] || 35;
  }

  public getSuspiciousAccounts(guildId: string, minScore: number = 30): any[] {
    return this.db.getAltDetectionScores(guildId, minScore);
  }

  public clearSuspiciousAccount(guildId: string, userId: string): void {
    this.db.deleteAltDetectionScore(guildId, userId);
  }
}

export const altDetector = AltDetector.getInstance();
