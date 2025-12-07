import { Guild, EmbedBuilder, TextChannel, User } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from './logger.js';

export async function sendModLog(
  guild: Guild,
  action: string,
  moderator: User,
  target: User,
  reason: string,
  additionalFields?: { name: string; value: string; inline?: boolean }[]
): Promise<void> {
  const db = DatabaseManager.getInstance();
  const guildData = db.getGuild(guild.id) as any;

  if (!guildData?.mod_log_channel_id) {
    return;
  }

  const modLogChannel = guild.channels.cache.get(guildData.mod_log_channel_id) as TextChannel;
  if (!modLogChannel?.isTextBased()) {
    return;
  }

  const colorMap: Record<string, number> = {
    'Kick': 0xFF9900,
    'Ban': 0xFF0000,
    'Unban': 0x00FF00,
    'Mute': 0xFFAA00,
    'Unmute': 0x00FF00,
    'Warning': 0xFFFF00,
    'Role Added': 0x00AAFF,
    'Role Removed': 0xFF6600
  };

  const embed = new EmbedBuilder()
    .setColor(colorMap[action] || 0x5865F2)
    .setTitle(`🛡️ ${action}`)
    .addFields(
      { name: '👤 User', value: `${target.toString()} (${target.id})`, inline: true },
      { name: '🛡️ Moderator', value: `${moderator.toString()} (${moderator.id})`, inline: true },
      { name: '📝 Reason', value: reason || 'No reason provided', inline: false }
    )
    .setTimestamp()
    .setFooter({ text: `User ID: ${target.id}` });

  if (additionalFields) {
    embed.addFields(additionalFields);
  }

  try {
    await modLogChannel.send({ embeds: [embed] });
    logger.info(`Sent ${action} log to mod channel in ${guild.name}`);
  } catch (error) {
    logger.error(`Failed to send ${action} log to mod channel`, error);
  }
}
