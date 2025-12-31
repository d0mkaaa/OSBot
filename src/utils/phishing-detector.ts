import { Message } from 'discord.js';
import { logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PhishingDomain {
  domain: string;
  type: 'phishing' | 'malware' | 'scam';
  severity: 'high' | 'medium' | 'low';
}

export class PhishingDetector {
  private static instance: PhishingDetector;
  private phishingDomains: Set<string>;
  private phishingPatterns: RegExp[];
  private lastUpdate: number;

  private constructor() {
    this.phishingDomains = new Set();
    this.phishingPatterns = [];
    this.lastUpdate = 0;
    this.loadPhishingData();
  }

  public static getInstance(): PhishingDetector {
    if (!PhishingDetector.instance) {
      PhishingDetector.instance = new PhishingDetector();
    }
    return PhishingDetector.instance;
  }

  private loadPhishingData(): void {
    try {
      const dataPath = path.join(__dirname, '..', 'data', 'phishing-domains.json');

      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        if (data.domains) {
          data.domains.forEach((entry: PhishingDomain) => {
            this.phishingDomains.add(entry.domain.toLowerCase());
          });
        }

        if (data.patterns) {
          this.phishingPatterns = data.patterns.map((p: string) => new RegExp(p, 'i'));
        }

        this.lastUpdate = Date.now();
        logger.info(`Loaded ${this.phishingDomains.size} phishing domains and ${this.phishingPatterns.length} patterns`);
      } else {
        logger.warn('Phishing domains file not found, creating default...');
        this.createDefaultPhishingData(dataPath);
      }
    } catch (error) {
      logger.error('Failed to load phishing data:', error);
    }
  }

  private createDefaultPhishingData(dataPath: string): void {
    const defaultData = {
      domains: [
        { domain: 'discord-nitro.ru', type: 'scam', severity: 'high' },
        { domain: 'discordnitro.ru', type: 'scam', severity: 'high' },
        { domain: 'discord-app.ru', type: 'scam', severity: 'high' },
        { domain: 'discordgift.ru', type: 'scam', severity: 'high' },
        { domain: 'steam-wallet.ru', type: 'scam', severity: 'high' },
        { domain: 'steamcommunlty.ru', type: 'phishing', severity: 'high' },
        { domain: 'steamcornmunity.ru', type: 'phishing', severity: 'high' },
        { domain: 'discordapp.info', type: 'phishing', severity: 'high' },
        { domain: 'discord-give.com', type: 'scam', severity: 'high' },
        { domain: 'free-nitro.ru', type: 'scam', severity: 'high' }
      ],
      patterns: [
        'discord.*nitro.*free',
        'free.*discord.*nitro',
        'steam.*wallet.*gift',
        'discord.*gift.*nitro',
        'claim.*nitro.*now',
        'free.*steam.*gift'
      ],
      lastUpdated: Date.now()
    };

    try {
      const dir = path.dirname(dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(dataPath, JSON.stringify(defaultData, null, 2));
      logger.info('Created default phishing data file');
      this.loadPhishingData();
    } catch (error) {
      logger.error('Failed to create default phishing data:', error);
    }
  }

  public checkMessage(message: Message): { isPhishing: boolean; domain?: string; type?: string } {
    const urlRegex = /(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?/gi;
    const urls = message.content.match(urlRegex);

    if (!urls) {
      return { isPhishing: false };
    }

    for (const url of urls) {
      const result = this.checkUrl(url);
      if (result.isPhishing) {
        return result;
      }
    }

    const lowerContent = message.content.toLowerCase();
    for (const pattern of this.phishingPatterns) {
      if (pattern.test(lowerContent)) {
        return { isPhishing: true, type: 'pattern' };
      }
    }

    return { isPhishing: false };
  }

  public checkUrl(url: string): { isPhishing: boolean; domain?: string; type?: string } {
    try {
      const urlLower = url.toLowerCase();

      let domain = '';
      if (urlLower.startsWith('http://') || urlLower.startsWith('https://')) {
        const urlObj = new URL(urlLower);
        domain = urlObj.hostname;
      } else {
        const parts = urlLower.split('/')[0].split('?')[0];
        domain = parts;
      }

      if (this.phishingDomains.has(domain)) {
        return { isPhishing: true, domain, type: 'known_phishing' };
      }

      const suspiciousPatterns = [
        /discord.*\.ru$/,
        /discor[d0].*\.(tk|ml|ga|cf|gq)$/,
        /steam.*\.(ru|tk|ml|ga|cf|gq)$/,
        /nitro.*\.(ru|tk|ml|ga|cf|gq)$/,
        /disc[o0]rd[^.]*\.(info|xyz|top|site|online|club)$/
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(domain)) {
          return { isPhishing: true, domain, type: 'suspicious_pattern' };
        }
      }

      const homoglyphs = this.checkHomoglyphs(domain);
      if (homoglyphs) {
        return { isPhishing: true, domain, type: 'homoglyph_attack' };
      }

      return { isPhishing: false };
    } catch (error) {
      logger.error('Error checking URL:', error);
      return { isPhishing: false };
    }
  }

  private checkHomoglyphs(domain: string): boolean {
    const suspiciousDomains = [
      'discord.com',
      'discord.gg',
      'discordapp.com',
      'steamcommunity.com',
      'steampowered.com'
    ];

    const homoglyphMap: { [key: string]: string[] } = {
      'o': ['0', 'ο', 'о', 'օ'],
      'i': ['l', '1', 'і', 'ӏ'],
      'a': ['а', 'ɑ'],
      'e': ['е', 'е'],
      'c': ['с', 'ϲ'],
      'm': ['rn', 'ⅿ'],
      'n': ['п'],
      'd': ['ԁ'],
      'p': ['р'],
      's': ['ѕ'],
      'u': ['υ', 'ս'],
      'y': ['у', 'ү']
    };

    for (const trustedDomain of suspiciousDomains) {
      const similarity = this.calculateSimilarity(domain, trustedDomain);
      if (similarity > 0.8 && domain !== trustedDomain) {
        return true;
      }
    }

    return false;
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

  public addPhishingDomain(domain: string, type: 'phishing' | 'malware' | 'scam' = 'phishing', severity: 'high' | 'medium' | 'low' = 'high'): void {
    this.phishingDomains.add(domain.toLowerCase());

    try {
      const dataPath = path.join(__dirname, '..', 'data', 'phishing-domains.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

      if (!data.domains.find((d: PhishingDomain) => d.domain === domain.toLowerCase())) {
        data.domains.push({ domain: domain.toLowerCase(), type, severity });
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        logger.info(`Added phishing domain: ${domain}`);
      }
    } catch (error) {
      logger.error('Failed to save phishing domain:', error);
    }
  }

  public removePhishingDomain(domain: string): void {
    this.phishingDomains.delete(domain.toLowerCase());

    try {
      const dataPath = path.join(__dirname, '..', 'data', 'phishing-domains.json');
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

      data.domains = data.domains.filter((d: PhishingDomain) => d.domain !== domain.toLowerCase());
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
      logger.info(`Removed phishing domain: ${domain}`);
    } catch (error) {
      logger.error('Failed to remove phishing domain:', error);
    }
  }

  public getPhishingDomains(): string[] {
    return Array.from(this.phishingDomains);
  }

  public reloadData(): void {
    this.phishingDomains.clear();
    this.phishingPatterns = [];
    this.loadPhishingData();
  }
}

export const phishingDetector = PhishingDetector.getInstance();
