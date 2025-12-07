import { Events, Invite, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.InviteCreate,

  async execute(invite: Invite): Promise<void> {
    if (!invite.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(invite.guild.id) as any;

    db.saveInvite(
      invite.guild.id,
      invite.code,
      invite.inviter?.id || null,
      invite.uses || 0,
      invite.maxUses || null
    );

    if (!guildData?.log_invite_events || !guildData?.log_channel_id) return;

    if (!('channels' in invite.guild)) return;

    const logChannel = await invite.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('📨 Invite Created')
      .addFields(
        { name: '👤 Created By', value: invite.inviter ? `${invite.inviter.tag} (${invite.inviter.id})` : 'Unknown', inline: true },
        { name: '📍 Channel', value: invite.channel ? `${invite.channel}` : 'Unknown', inline: true },
        { name: '🔗 Code', value: `discord.gg/${invite.code}`, inline: false }
      )
      .setTimestamp();

    if (invite.maxUses) {
      embed.addFields({ name: '📊 Max Uses', value: invite.maxUses.toString(), inline: true });
    }

    if (invite.expiresTimestamp) {
      embed.addFields({ name: '⏱️ Expires', value: `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>`, inline: true });
    }

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send invite create log', error);
    }
  }
};

export default event;
