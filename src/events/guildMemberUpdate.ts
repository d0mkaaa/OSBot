import { Events, GuildMember, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.GuildMemberUpdate,

  async execute(oldMember: GuildMember, newMember: GuildMember): Promise<void> {
    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(newMember.guild.id) as any;

    if (oldMember.nickname !== newMember.nickname) {
      const lockedData = db.getLockedNickname(newMember.guild.id, newMember.id) as any;

      if (lockedData) {
        try {
          await newMember.setNickname(lockedData.locked_nickname, 'Nickname is locked');
          logger.info(`Reset locked nickname for ${newMember.user.tag} in ${newMember.guild.name}`);
        } catch (error) {
          logger.error(`Failed to reset locked nickname for ${newMember.user.tag}`, error);
        }
      }
    }

    if (guildData?.log_role_changes && guildData?.log_channel_id) {
      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRoles = newRoles.filter(role => !oldRoles.has(role.id) && role.id !== newMember.guild.id);
      const removedRoles = oldRoles.filter(role => !newRoles.has(role.id) && role.id !== oldMember.guild.id);

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        const logChannel = await newMember.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
        if (logChannel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setColor(0x3498db)
            .setTitle('🎭 Member Roles Updated')
            .addFields({ name: '👤 Member', value: `${newMember} (${newMember.id})`, inline: false })
            .setTimestamp();

          if (addedRoles.size > 0) {
            embed.addFields({
              name: '➕ Roles Added',
              value: addedRoles.map(r => r.toString()).join(', '),
              inline: false
            });
          }

          if (removedRoles.size > 0) {
            embed.addFields({
              name: '➖ Roles Removed',
              value: removedRoles.map(r => r.toString()).join(', '),
              inline: false
            });
          }

          try {
            await logChannel.send({ embeds: [embed] });
          } catch (error) {
            logger.error('Failed to send role change log', error);
          }
        }
      }
    }
  }
};

export default event;
