import { Events, VoiceState, EmbedBuilder, TextChannel } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { MusicManager } from '../music/MusicManager.js';

const autoLeaveTimeouts = new Map<string, NodeJS.Timeout>();

const event: BotEvent = {
  name: Events.VoiceStateUpdate,

  async execute(oldState: VoiceState, newState: VoiceState): Promise<void> {
    if (!oldState.guild) return;

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(oldState.guild.id) as any;

    handleMusicAutoLeave(oldState, newState);

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

function handleMusicAutoLeave(oldState: VoiceState, newState: VoiceState): void {
  const guild = newState.guild;
  if (!guild) return;

  const musicManager = MusicManager.getInstance();
  const queue = musicManager.getQueue(guild.id);

  if (!queue) return;

  const botMember = guild.members.me;
  if (!botMember) return;

  const botVoiceChannel = botMember.voice.channel;
  if (!botVoiceChannel) return;

  const db = DatabaseManager.getInstance();
  const musicSettings = db.getOrCreateMusicSettings(guild.id);

  if (musicSettings.twentyfour_seven) {
    return;
  }

  if (oldState.channelId === botVoiceChannel.id) {
    const membersInChannel = botVoiceChannel.members.filter(m => !m.user.bot);

    if (membersInChannel.size === 0 && musicSettings.auto_leave) {
      const existingTimeout = autoLeaveTimeouts.get(guild.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        autoLeaveTimeouts.delete(guild.id);
      }

      const timeoutMs = Math.max(1000, (musicSettings.auto_leave_timeout || 60) * 1000);

      const timeout = setTimeout(() => {
        const currentChannel = guild.members.me?.voice.channel;
        if (!currentChannel) {
          autoLeaveTimeouts.delete(guild.id);
          return;
        }

        const currentMembers = currentChannel.members.filter(m => !m.user.bot);
        if (currentMembers.size === 0) {
          musicManager.stop(guild.id);
        }
        autoLeaveTimeouts.delete(guild.id);
      }, timeoutMs);

      autoLeaveTimeouts.set(guild.id, timeout);
    } else if (membersInChannel.size > 0) {
      const existingTimeout = autoLeaveTimeouts.get(guild.id);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        autoLeaveTimeouts.delete(guild.id);
      }
    }
  }

  if (newState.member?.id === botMember.id && newState.channelId === null) {
    const existingTimeout = autoLeaveTimeouts.get(guild.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      autoLeaveTimeouts.delete(guild.id);
    }
    musicManager.stop(guild.id);
  }
}

export default event;
