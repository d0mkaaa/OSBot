import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface BotConfig {
  bot: {
    defaultPrefix: string;
    owners: string[];
    statusMessages: string[];
    statusUpdateInterval: number;
  };
  features: {
    welcomeMessages: boolean;
    goodbyeMessages: boolean;
    levelingSystem: boolean;
    autoModeration: boolean;
    customCommands: boolean;
  };
  leveling: {
    enabled: boolean;
    xpPerMessage: number;
    xpCooldown: number;
    levelUpMessage: string;
  };
  moderation: {
    maxWarnings: number;
    warningAction: string;
    muteDuration: number;
  };
  colors: {
    primary: number;
    success: number;
    error: number;
    warning: number;
    info: number;
  };
}

export class ConfigManager {
  private static instance: ConfigManager;
  private config: BotConfig;
  private configPath: string;

  private constructor() {
    this.configPath = join(__dirname, '..', 'config', 'config.json');
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private loadConfig(): BotConfig {
    try {
      if (!existsSync(this.configPath)) {
        throw new Error('Config file not found');
      }

      const configData = readFileSync(this.configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load config, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): BotConfig {
    return {
      bot: {
        defaultPrefix: '/',
        owners: [],
        statusMessages: ['/help for commands'],
        statusUpdateInterval: 300000
      },
      features: {
        welcomeMessages: true,
        goodbyeMessages: true,
        levelingSystem: false,
        autoModeration: false,
        customCommands: true
      },
      leveling: {
        enabled: false,
        xpPerMessage: 10,
        xpCooldown: 60000,
        levelUpMessage: '🎉 {user}, you\'ve reached level {level}!'
      },
      moderation: {
        maxWarnings: 3,
        warningAction: 'mute',
        muteDuration: 3600000
      },
      colors: {
        primary: 0x5865F2,
        success: 0x00FF00,
        error: 0xFF0000,
        warning: 0xFFFF00,
        info: 0x3498DB
      }
    };
  }

  public get<K extends keyof BotConfig>(key: K): BotConfig[K] {
    return this.config[key];
  }

  public set<K extends keyof BotConfig>(key: K, value: BotConfig[K]): void {
    this.config[key] = value;
    this.saveConfig();
  }

  public getColor(type: keyof BotConfig['colors']): number {
    return this.config.colors[type];
  }

  private saveConfig(): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  public reload(): void {
    this.config = this.loadConfig();
  }
}

export const config = ConfigManager.getInstance();
