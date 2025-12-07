import { Events, Message, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { afkUsers } from '../commands/utility/afk.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';
import { autoModerator } from '../utils/automod.js';
import { broadcastMessage } from '../dashboard/websocket.js';
import { t } from '../utils/i18n.js';

const AFK_CLEANUP_INTERVAL = 3600000;
const AFK_MAX_AGE = 172800000;

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, afkData] of afkUsers.entries()) {
    if (now - afkData.since > AFK_MAX_AGE) {
      afkUsers.delete(userId);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.info(`Cleaned up ${cleaned} expired AFK entries`);
  }
}, AFK_CLEANUP_INTERVAL);

const event: BotEvent = {
  name: Events.MessageCreate,

  async execute(message: Message): Promise<void> {
    if (message.author.bot) return;
    if (!message.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(message.guild.id) as any;

    try {
      broadcastMessage(message.channel.id, {
        id: message.id,
        content: message.content,
        author: {
          id: message.author.id,
          username: message.author.username,
          discriminator: message.author.discriminator,
          avatar: message.author.displayAvatarURL({ size: 64 })
        },
        timestamp: message.createdTimestamp,
        attachments: message.attachments.map(att => ({
          id: att.id,
          name: att.name,
          url: att.url
        })),
        embeds: message.embeds.map(embed => ({
          title: embed.title,
          description: embed.description,
          url: embed.url,
          color: embed.color
        }))
      });
    } catch (error) {
      logger.error('Failed to broadcast message to dashboard', error);
    }

    const violated = await autoModerator.checkMessage(message);
    if (violated) return;

    if (message.content.startsWith('!')) {
      const args = message.content.slice(1).trim().split(/ +/);
      const commandName = args[0]?.toLowerCase();

      if (commandName) {
        const customCmd = db.getCustomCommand(message.guild.id, commandName) as any;
        if (customCmd) {
          db.incrementCustomCommandUses(message.guild.id, commandName);
          await message.reply(customCmd.response);
          return;
        }
      }
    }

    const locale = guildData?.locale || 'en';

    if (afkUsers.has(message.author.id)) {
      const afkData = afkUsers.get(message.author.id)!;
      afkUsers.delete(message.author.id);

      const duration = Date.now() - afkData.since;
      const minutes = Math.floor(duration / 60000);

      await message.reply({
        content: t('commands.afk.welcome_back', locale, {
          minutes: minutes.toString(),
          plural: minutes === 1 ? '' : 's'
        })
      });
    }

    const mentions = message.mentions.users;
    for (const [userId, user] of mentions) {
      if (afkUsers.has(userId)) {
        const afkData = afkUsers.get(userId)!;
        const duration = Date.now() - afkData.since;
        const minutes = Math.floor(duration / 60000);

        await message.reply({
          content: t('commands.afk.mention_afk', locale, {
            user: user.tag,
            minutes: minutes.toString(),
            plural: minutes === 1 ? '' : 's',
            reason: afkData.reason
          })
        });
      }
    }

    if (guildData?.xp_enabled) {
      try {
        const cooldownSeconds = guildData.xp_cooldown || 60;
        const onCooldown = db.checkXPCooldown(message.guild.id, message.author.id, cooldownSeconds);

        if (!onCooldown) {
          const xpMin = guildData.xp_min || 15;
          const xpMax = guildData.xp_max || 25;
          const xpGain = Math.floor(Math.random() * (xpMax - xpMin + 1)) + xpMin;

          const result = db.addXP(message.guild.id, message.author.id, xpGain);
          db.updateXPCooldown(message.guild.id, message.author.id);

          if (result.leveled && guildData.level_up_enabled) {
            const levelRoles = db.getLevelRoles(message.guild.id) as any[];
            const levelRole = levelRoles.find(lr => lr.level === result.newLevel);

            if (levelRole) {
              try {
                const member = await message.guild.members.fetch(message.author.id);
                const role = message.guild.roles.cache.get(levelRole.role_id);
                if (role && !member.roles.cache.has(role.id)) {
                  await member.roles.add(role);
                }
              } catch (error) {
                logger.error('Failed to assign level role', error);
              }
            }

            let levelUpMessage = guildData.level_up_message || t('common.xp.level_up', locale, {
              user: message.author.toString(),
              level: result.newLevel.toString()
            });

            if (guildData.level_up_message) {
              levelUpMessage = guildData.level_up_message
                .replace('{user}', message.author.toString())
                .replace('{level}', result.newLevel.toString());
            }

            const levelUpChannel = guildData.level_up_channel_id
              ? message.guild.channels.cache.get(guildData.level_up_channel_id) as TextChannel
              : message.channel as TextChannel;

            if (levelUpChannel?.isTextBased()) {
              try {
                await levelUpChannel.send(levelUpMessage);
              } catch (error) {
                logger.error('Failed to send level up message', error);
              }
            }
          }
        }
      } catch (error: any) {
        if (error?.code !== 'SQLITE_BUSY') {
          logger.error('Error processing XP in messageCreate', error);
        }
      }
    }
  }
};

export default event;
