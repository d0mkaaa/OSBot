import { Events, VoiceState, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';

const event: BotEvent = {
  name: Events.VoiceStateUpdate,

  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (!oldState.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(oldState.guild.id) as any;

    if (!guildData?.log_voice_activity || !guildData?.log_channel_id) return;

    const logChannel = await oldState.guild.channels.fetch(guildData.log_channel_id).catch(() => null) as TextChannel | null;
    if (!logChannel?.isTextBased()) return;

    const member = newState.member || oldState.member;
    if (!member) return;

    const embed = new EmbedBuilder()
      .setTimestamp()
      .addFields({ name: '👤 Member', value: `${member} (${member.id})`, inline: true });

    if (!oldState.channel && newState.channel) {
      embed
        .setColor(0x00FF00)
        .setTitle('🔊 Voice Channel Joined')
        .addFields({ name: '📍 Channel', value: newState.channel.name, inline: true });
    }
    else if (oldState.channel && !newState.channel) {
      embed
        .setColor(0xFF0000)
        .setTitle('🔇 Voice Channel Left')
        .addFields({ name: '📍 Channel', value: oldState.channel.name, inline: true });
    }
    else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      embed
        .setColor(0xFFA500)
        .setTitle('🔀 Voice Channel Moved')
        .addFields(
          { name: '📍 From', value: oldState.channel.name, inline: true },
          { name: '📍 To', value: newState.channel.name, inline: true }
        );
    }
    else if (oldState.channel && newState.channel) {
      const changes = [];

      if (oldState.serverMute !== newState.serverMute) {
        changes.push(`Server ${newState.serverMute ? 'muted' : 'unmuted'}`);
      }
      if (oldState.serverDeaf !== newState.serverDeaf) {
        changes.push(`Server ${newState.serverDeaf ? 'deafened' : 'undeafened'}`);
      }
      if (oldState.selfMute !== newState.selfMute) {
        changes.push(`Self ${newState.selfMute ? 'muted' : 'unmuted'}`);
      }
      if (oldState.selfDeaf !== newState.selfDeaf) {
        changes.push(`Self ${newState.selfDeaf ? 'deafened' : 'undeafened'}`);
      }

      if (changes.length === 0) return;

      embed
        .setColor(0x3498db)
        .setTitle('🎙️ Voice State Changed')
        .addFields(
          { name: '📍 Channel', value: newState.channel.name, inline: true },
          { name: '📝 Changes', value: changes.join(', '), inline: false }
        );
    } else {
      return;
    }

    try {
      await logChannel.send({ embeds: [embed] });
    } catch {
    }
  }
};

export default event;
