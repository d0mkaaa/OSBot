import { Router, Request, Response } from 'express';
import { isAuthenticated, hasGuildAccess } from '../middleware/auth-check.js';
import { ChannelType, PermissionFlagsBits, TextChannel } from 'discord.js';

export function createChatRoutes(client: any): Router {
  const router = Router();

  router.get('/guilds/:guildId/channels', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId } = req.params;
      const guild = client.guilds.cache.get(guildId);

      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const channels = guild.channels.cache
        .filter((ch: any) => ch.type === ChannelType.GuildText && ch.viewable)
        .map((ch: any) => ({
          id: ch.id,
          name: ch.name,
          parent: ch.parent?.name || null,
          parentId: ch.parentId || null
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      res.json({ success: true, data: channels });
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch channels' });
    }
  });

  router.get('/guilds/:guildId/channels/:channelId/messages', isAuthenticated, hasGuildAccess, async (req: Request, res: Response) => {
    try {
      const { guildId, channelId } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      const guild = client.guilds.cache.get(guildId);
      if (!guild) {
        return res.status(404).json({ success: false, error: 'Guild not found' });
      }

      const channel = guild.channels.cache.get(channelId) as TextChannel;
      if (!channel || channel.type !== ChannelType.GuildText) {
        return res.status(404).json({ success: false, error: 'Channel not found' });
      }

      const messages = await channel.messages.fetch({ limit });

      const formattedMessages = messages.map(msg => ({
        id: msg.id,
        content: msg.content,
        author: {
          id: msg.author.id,
          username: msg.author.username,
          discriminator: msg.author.discriminator,
          avatar: msg.author.displayAvatarURL()
        },
        timestamp: msg.createdTimestamp,
        embeds: msg.embeds.map(e => ({
          title: e.title,
          description: e.description,
          color: e.color,
          url: e.url
        })),
        attachments: msg.attachments.map(att => ({
          id: att.id,
          url: att.url,
          name: att.name,
          size: att.size
        })),
        reactions: msg.reactions.cache.map(r => ({
          emoji: r.emoji.name,
          count: r.count
        }))
      })).reverse();

      res.json({ success: true, data: formattedMessages });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
  });

  return router;
}
