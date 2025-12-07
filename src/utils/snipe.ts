import { Message, PartialMessage } from 'discord.js';

interface SnipeData {
  content: string;
  author: {
    id: string;
    tag: string;
    avatarURL: string | null;
  };
  channelId: string;
  deletedAt: Date;
  attachments: string[];
}

export class SnipeManager {
  private snipes: Map<string, SnipeData>;
  private readonly SNIPE_TIMEOUT = 60000;

  constructor() {
    this.snipes = new Map();
  }

  public addSnipe(message: Message | PartialMessage): void {
    if (!message.guild || message.author?.bot) return;
    if (!message.content && message.attachments.size === 0) return;

    const channelId = message.channel.id;
    const snipeData: SnipeData = {
      content: message.content || '',
      author: {
        id: message.author?.id || 'Unknown',
        tag: message.author?.tag || 'Unknown User',
        avatarURL: message.author?.displayAvatarURL() || null
      },
      channelId,
      deletedAt: new Date(),
      attachments: Array.from(message.attachments.values()).map(att => att.url)
    };

    this.snipes.set(channelId, snipeData);

    setTimeout(() => {
      const current = this.snipes.get(channelId);
      if (current?.deletedAt === snipeData.deletedAt) {
        this.snipes.delete(channelId);
      }
    }, this.SNIPE_TIMEOUT);
  }

  public getSnipe(channelId: string): SnipeData | null {
    return this.snipes.get(channelId) || null;
  }

  public clearSnipe(channelId: string): void {
    this.snipes.delete(channelId);
  }
}

export const snipeManager = new SnipeManager();
