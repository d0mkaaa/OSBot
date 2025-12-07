import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.limits.entries()) {
      if (entry.resetAt < now) {
        toDelete.push(key);
      }
    }

    for (const key of toDelete) {
      this.limits.delete(key);
    }

    if (toDelete.length > 0) {
      logger.debug(`Rate limiter cleanup: removed ${toDelete.length} expired entries`);
    }
  }

  check(identifier: string, maxRequests: number, windowMs: number): { allowed: boolean; resetAt: number } {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || entry.resetAt < now) {
      const resetAt = now + windowMs;
      this.limits.set(identifier, { count: 1, resetAt });
      return { allowed: true, resetAt };
    }

    if (entry.count >= maxRequests) {
      return { allowed: false, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, resetAt: entry.resetAt };
  }

  destroy() {
    clearInterval(this.cleanupInterval);
    this.limits.clear();
  }
}

const globalLimiter = new RateLimiter();

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
}) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req: Request) => {
      const user = req.user as any;
      return user?.id || req.ip || 'anonymous';
    },
    skipFailedRequests = false
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const { allowed, resetAt } = globalLimiter.check(key, maxRequests, windowMs);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetAt / 1000).toString());

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());

      logger.warn(`Rate limit exceeded for ${key} - IP: ${req.ip}, Path: ${req.path}, Method: ${req.method}`);

      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter
      });
    }

    if (skipFailedRequests) {
      const originalSend = res.json.bind(res);
      res.json = function (body: any) {
        if (res.statusCode >= 400) {
          const entry = globalLimiter['limits'].get(key);
          if (entry && entry.count > 0) {
            entry.count--;
          }
        }
        return originalSend(body);
      };
    }

    next();
  };
}

export const strictRateLimit = createRateLimiter({
  windowMs: 60000,
  maxRequests: 30
});

export const moderateRateLimit = createRateLimiter({
  windowMs: 60000,
  maxRequests: 60
});

export const relaxedRateLimit = createRateLimiter({
  windowMs: 60000,
  maxRequests: 120
});

export const perGuildRateLimit = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
  keyGenerator: (req: Request) => {
    const user = req.user as any;
    const guildId = req.params.guildId;
    return `${user?.id || req.ip}:${guildId}`;
  }
});
