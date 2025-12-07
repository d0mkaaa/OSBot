import { Events, Invite, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.InviteDelete,

  async execute(invite: Invite): Promise<void> {
    if (!invite.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(invite.guild.id) as any;

    db.removeInvite(invite.guild.id, invite.code);

    if (!guildData?.log_invite_events || !guildData?.log_channel_id) return;

    if (!('channels' in invite.guild)) return;

    const logChannel = await invite.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('🗑️ Invite Deleted')
      .addFields(
        { name: '🔗 Code', value: `discord.gg/${invite.code}`, inline: true },
        { name: '📍 Channel', value: invite.channel ? `${invite.channel}` : 'Unknown', inline: true }
      )
      .setTimestamp();

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send invite delete log', error);
    }
  }
};

export default event;
