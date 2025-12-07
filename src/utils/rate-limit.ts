import { Collection } from 'discord.js';

interface CooldownEntry {
  expiresAt: number;
  uses: number;
}

export class RateLimiter {
  private cooldowns: Collection<string, CooldownEntry>;
  private readonly defaultCooldown: number;
  private readonly maxUses: number;

  constructor(cooldownSeconds: number = 3, maxUses: number = 1) {
    this.cooldowns = new Collection();
    this.defaultCooldown = cooldownSeconds * 1000;
    this.maxUses = maxUses;
  }

  public isOnCooldown(userId: string, commandName: string): boolean {
    const key = `${userId}-${commandName}`;
    const entry = this.cooldowns.get(key);

    if (!entry) return false;

    const now = Date.now();
    if (now >= entry.expiresAt) {
      this.cooldowns.delete(key);
      return false;
    }

    return entry.uses >= this.maxUses;
  }

  public getRemainingCooldown(userId: string, commandName: string): number {
    const key = `${userId}-${commandName}`;
    const entry = this.cooldowns.get(key);

    if (!entry) return 0;

    const now = Date.now();
    const remaining = entry.expiresAt - now;

    return Math.max(0, Math.ceil(remaining / 1000));
  }

  public setCooldown(userId: string, commandName: string, customCooldown?: number): void {
    const key = `${userId}-${commandName}`;
    const cooldownMs = customCooldown ? customCooldown * 1000 : this.defaultCooldown;
    const entry = this.cooldowns.get(key);

    if (entry && Date.now() < entry.expiresAt) {
      entry.uses++;
    } else {
      this.cooldowns.set(key, {
        expiresAt: Date.now() + cooldownMs,
        uses: 1
      });
    }
  }

  public clearCooldown(userId: string, commandName: string): void {
    const key = `${userId}-${commandName}`;
    this.cooldowns.delete(key);
  }

  public cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, entry] of this.cooldowns.entries()) {
      if (now >= entry.expiresAt) {
        expired.push(key);
      }
    }

    for (const key of expired) {
      this.cooldowns.delete(key);
    }
  }
}

const CLEANUP_INTERVAL = 300000;
export const globalRateLimiter = new RateLimiter(3, 1);

setInterval(() => {
  globalRateLimiter.cleanup();
}, CLEANUP_INTERVAL);
