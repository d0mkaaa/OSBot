import { i18n } from './i18n.js';
import { DatabaseManager } from '../database/Database.js';

export interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  emoji: string;
}

export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', emoji: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', emoji: '🇫🇷' },
];

export class LocaleManager {
  static getGuildLocale(guildId: string): string {
    const db = DatabaseManager.getInstance();
    const guild = db.getGuild(guildId) as any;
    return guild?.locale || 'en';
  }

  static setGuildLocale(guildId: string, locale: string): boolean {
    if (!this.isValidLocale(locale)) {
      return false;
    }

    const db = DatabaseManager.getInstance();
    return db.updateGuild(guildId, { locale });
  }

  static isValidLocale(locale: string): boolean {
    return SUPPORTED_LOCALES.some(l => l.code === locale);
  }

  static getAvailableLocales(): LocaleConfig[] {
    return SUPPORTED_LOCALES;
  }

  static getLocaleInfo(code: string): LocaleConfig | undefined {
    return SUPPORTED_LOCALES.find(l => l.code === code);
  }

  static mapDiscordLocale(discordLocale: string): string {
    const mapping: Record<string, string> = {
      'en-US': 'en',
      'en-GB': 'en',
      'es-ES': 'es',
      'es-419': 'es',
      'fr': 'fr',
    };

    return mapping[discordLocale] || 'en';
  }

  static t(key: string, locale: string = 'en', params?: Record<string, string | number>): string {
    return i18n.translate(key, locale, params);
  }

  static formatNumber(num: number, locale: string = 'en'): string {
    try {
      return new Intl.NumberFormat(locale).format(num);
    } catch {
      return num.toString();
    }
  }

  static formatDate(date: Date, locale: string = 'en', options?: Intl.DateTimeFormatOptions): string {
    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch {
      return date.toISOString();
    }
  }

  static formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  static formatRelativeTime(timestamp: number, locale: string = 'en'): string {
    const now = Date.now();
    const diff = timestamp - now;
    const seconds = Math.floor(Math.abs(diff) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    try {
      const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

      if (days > 0) {
        return rtf.format(diff > 0 ? days : -days, 'day');
      } else if (hours > 0) {
        return rtf.format(diff > 0 ? hours : -hours, 'hour');
      } else if (minutes > 0) {
        return rtf.format(diff > 0 ? minutes : -minutes, 'minute');
      } else {
        return rtf.format(diff > 0 ? seconds : -seconds, 'second');
      }
    } catch {
      return new Date(timestamp).toLocaleString(locale);
    }
  }

  static pluralize(count: number, key: string, locale: string = 'en'): string {
    const pluralKey = count === 1 ? `${key}.singular` : `${key}.plural`;
    return this.t(pluralKey, locale, { count });
  }
}

export function getGuildLocale(guildId: string): string {
  return LocaleManager.getGuildLocale(guildId);
}

export function setGuildLocale(guildId: string, locale: string): boolean {
  return LocaleManager.setGuildLocale(guildId, locale);
}

export function getSupportedLocales(): LocaleConfig[] {
  return LocaleManager.getAvailableLocales();
}

export function isValidLocale(locale: string): boolean {
  return LocaleManager.isValidLocale(locale);
}
