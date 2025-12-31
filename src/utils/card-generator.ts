import { AttachmentBuilder } from 'discord.js';

export interface RankCardData {
  username: string;
  avatarURL: string;
  rank: number;
  level: number;
  currentXP: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  messages: number;
  bgColor?: string;
  accentColor?: string;
  bgImage?: string;
}

export class CardGenerator {
  static generateProgressBar(current: number, total: number, length: number = 20, fillChar: string = '█', emptyChar: string = '░'): string {
    const progress = Math.min(current / total, 1);
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    return fillChar.repeat(filled) + emptyChar.repeat(empty);
  }

  static generateTextCard(data: RankCardData): string {
    const xpProgress = data.currentXP - data.xpForCurrentLevel;
    const xpTotal = data.xpForNextLevel - data.xpForCurrentLevel;
    const progressPercentage = Math.floor((xpProgress / xpTotal) * 100);
    const progressBar = this.generateProgressBar(xpProgress, xpTotal, 20);

    const card = `
╔═══════════════════════════════════════╗
║              RANK CARD                ║
╠═══════════════════════════════════════╣
║                                       ║
║  👤 ${data.username.padEnd(30, ' ')}  ║
║                                       ║
║  📊 Rank: #${data.rank.toString().padStart(4, ' ')}                      ║
║  ⭐ Level: ${data.level.toString().padStart(4, ' ')}                     ║
║  💬 Messages: ${data.messages.toString().padStart(7, ' ')}              ║
║                                       ║
║  Progress to Level ${(data.level + 1).toString()}:                 ║
║  ${progressBar} ${progressPercentage}%  ║
║                                       ║
║  XP: ${xpProgress.toLocaleString()}/${xpTotal.toLocaleString()}${' '.repeat(Math.max(0, 20 - xpProgress.toLocaleString().length - xpTotal.toLocaleString().length))}║
║                                       ║
╚═══════════════════════════════════════╝
    `.trim();

    return card;
  }

  static async generateCard(data: RankCardData): Promise<string | AttachmentBuilder> {
    return this.generateTextCard(data);
  }
}
