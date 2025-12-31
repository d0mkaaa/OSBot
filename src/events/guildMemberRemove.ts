import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { DatabaseManager } from '../database/Database.js';
import { buildCustomEmbed } from '../utils/embedBuilder.js';
import { AnalyticsTracker } from '../utils/analytics-tracker.js';

const event: BotEvent = {
  name: Events.GuildMemberRemove,

  async execute(member: GuildMember): Promise<void> {
    logger.info(`Member left: ${member.user.tag} from ${member.guild.name}`);

    const db = DatabaseManager.getInstance();
    const analytics = AnalyticsTracker.getInstance();
    const guildData = db.getGuild(member.guild.id) as any;

    analytics.trackMemberLeave(member.guild.id);

    if (!guildData || !guildData.goodbye_enabled) {
      return;
    }

    const channelId = guildData.goodbye_channel_id || member.guild.systemChannelId;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId) as TextChannel;
    if (!channel || !channel.isTextBased()) return;

    try {
      if (guildData.goodbye_embed) {
        const embedConfig = JSON.parse(guildData.goodbye_embed);
        const goodbyeEmbed = buildCustomEmbed(embedConfig, {
          user: member.user.tag,
          userTag: member.user.tag,
          userAvatar: member.user.displayAvatarURL(),
          server: member.guild.name
        });

        await channel.send({ embeds: [goodbyeEmbed] });
      } else {
        const message = (guildData.goodbye_message || '{user} has left the server.')
          .replace('{user}', member.user.tag)
          .replace('{server}', member.guild.name)
          .replace('{memberCount}', member.guild.memberCount.toString());

        const goodbyeEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('👋 Goodbye!')
          .setDescription(message)
          .addFields(
            { name: '👥 Members Left', value: member.guild.memberCount.toString(), inline: true },
            { name: '📅 Joined', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>` : 'Unknown', inline: true }
          )
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setTimestamp();

        await channel.send({ embeds: [goodbyeEmbed] });
      }
    } catch (error) {
      logger.error(`Failed to send goodbye message in ${member.guild.name}`, error);
    }

    if (guildData.log_member_leave && guildData.log_channel_id) {
      const logChannel = member.guild.channels.cache.get(guildData.log_channel_id) as TextChannel;
      if (logChannel?.isTextBased()) {
        const roles = member.roles.cache
          .filter(role => role.id !== member.guild.id)
          .map(role => role.toString())
          .join(', ') || 'None';

        const logEmbed = new EmbedBuilder()
          .setColor(0xFF0000)
          .setTitle('📤 Member Left')
          .setDescription(`${member} left the server`)
          .addFields(
            { name: '👤 User', value: `${member.user.tag} (${member.id})`, inline: true },
            { name: '📅 Joined Server', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>` : 'Unknown', inline: true },
            { name: '👥 Member Count', value: `${member.guild.memberCount}`, inline: true },
            { name: '🎭 Roles', value: roles.slice(0, 1024), inline: false }
          )
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        try {
          await logChannel.send({ embeds: [logEmbed] });
        } catch (error) {
          logger.error('Failed to send leave log', error);
        }
      }
    }
  }
};

export default event;
