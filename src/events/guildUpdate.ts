import { Events, Guild, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';

const event: BotEvent = {
  name: Events.GuildUpdate,

  async execute(oldGuild: Guild, newGuild: Guild): Promise<void> {
    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(newGuild.id) as any;

    if (!guildData?.log_server_events || !guildData?.log_channel_id) return;

    const logChannel = await newGuild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('⚙️ Server Updated')
      .setTimestamp();

    let hasChanges = false;

    if (oldGuild.name !== newGuild.name) {
      embed.addFields({
        name: '🏷️ Name Changed',
        value: `${oldGuild.name} → ${newGuild.name}`,
        inline: false
      });
      hasChanges = true;
    }

    if (oldGuild.description !== newGuild.description) {
      embed.addFields({
        name: '📝 Description Changed',
        value: `Before: ${oldGuild.description || 'None'}\nAfter: ${newGuild.description || 'None'}`.slice(0, 1024),
        inline: false
      });
      hasChanges = true;
    }

    if (oldGuild.iconURL() !== newGuild.iconURL()) {
      embed.addFields({
        name: '🖼️ Icon Changed',
        value: newGuild.iconURL() ? '[New Icon](' + newGuild.iconURL() + ')' : 'Icon removed',
        inline: true
      });
      if (newGuild.iconURL()) {
        embed.setThumbnail(newGuild.iconURL()!);
      }
      hasChanges = true;
    }

    if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
      embed.addFields({
        name: '🎨 Banner Changed',
        value: newGuild.bannerURL() ? '[New Banner](' + newGuild.bannerURL() + ')' : 'Banner removed',
        inline: true
      });
      hasChanges = true;
    }

    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
      const levels = ['None', 'Low', 'Medium', 'High', 'Very High'];
      embed.addFields({
        name: '🔒 Verification Level',
        value: `${levels[oldGuild.verificationLevel]} → ${levels[newGuild.verificationLevel]}`,
        inline: true
      });
      hasChanges = true;
    }

    if (oldGuild.explicitContentFilter !== newGuild.explicitContentFilter) {
      const filters = ['Disabled', 'Members without roles', 'All members'];
      embed.addFields({
        name: '🔞 Explicit Content Filter',
        value: `${filters[oldGuild.explicitContentFilter]} → ${filters[newGuild.explicitContentFilter]}`,
        inline: true
      });
      hasChanges = true;
    }

    if (oldGuild.ownerId !== newGuild.ownerId) {
      const oldOwner = await oldGuild.members.fetch(oldGuild.ownerId).catch(() => null);
      const newOwner = await newGuild.members.fetch(newGuild.ownerId).catch(() => null);
      embed.addFields({
        name: '👑 Owner Changed',
        value: `${oldOwner?.user.tag || oldGuild.ownerId} → ${newOwner?.user.tag || newGuild.ownerId}`,
        inline: false
      });
      hasChanges = true;
    }

    if (!hasChanges) return;

    try {
      await logChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send guild update log', error);
    }
  }
};

export default event;
