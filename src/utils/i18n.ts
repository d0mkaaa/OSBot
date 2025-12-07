import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TranslationData {
  [key: string]: string | string[] | TranslationData;
}

class I18nManager {
  private translations: Map<string, TranslationData> = new Map();
  private defaultLocale = 'en';

  constructor() {
    this.loadLocale('en');
  }

  private loadLocale(locale: string): void {
    try {
      const localePath = join(__dirname, '..', 'locales', `${locale}.json`);
      const data = JSON.parse(readFileSync(localePath, 'utf-8'));
      this.translations.set(locale, data);
      logger.info(`Loaded locale: ${locale}`);
    } catch (error) {
      if (locale !== this.defaultLocale) {
        logger.warn(`Failed to load locale ${locale}, falling back to ${this.defaultLocale}`);
      } else {
        logger.error(`Failed to load default locale ${this.defaultLocale}`, error);
      }
    }
  }

  public getAvailableLocales(): string[] {
    return Array.from(this.translations.keys());
  }

  public translate(key: string, locale: string = this.defaultLocale, params?: Record<string, string | number>): string {
    if (!this.translations.has(locale)) {
      this.loadLocale(locale);
    }

    const translation = this.getNestedValue(this.translations.get(locale) || {}, key);

    if (!translation) {
      if (locale !== this.defaultLocale) {
        return this.translate(key, this.defaultLocale, params);
      }
      logger.warn(`Translation key not found: ${key}`);
      return key;
    }

    if (Array.isArray(translation)) {
      return translation.join('\n');
    }

    if (typeof translation !== 'string') {
      logger.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    return this.replaceParams(translation, params);
  }

  private getNestedValue(obj: TranslationData, path: string): string | string[] | TranslationData | undefined {
    const keys = path.split('.');
    let current: string | string[] | TranslationData | undefined = obj;

    for (const key of keys) {
      if (Array.isArray(current)) {
        return undefined;
      }
      if (typeof current === 'object' && current !== null && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private replaceParams(text: string, params?: Record<string, string | number>): string {
    if (!params) return text;

    let result = text;
    for (const [key, value] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }
    return result;
  }
}

export const i18n = new I18nManager();

export function t(key: string, locale?: string, params?: Record<string, string | number>): string {
  return i18n.translate(key, locale, params);
}

export function ta(key: string, locale?: string): string[] {
  if (!i18n['translations'].has(locale || 'en')) {
    i18n['loadLocale'](locale || 'en');
  }

  const translation = i18n['getNestedValue'](i18n['translations'].get(locale || 'en') || {}, key);

  if (Array.isArray(translation)) {
    return translation;
  }

  if (typeof translation === 'string') {
    return [translation];
  }

  logger.warn(`Translation key not found or not an array: ${key}`);
  return [key];
}
