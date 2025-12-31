import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume the paused song'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        ephemeral: true
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({
        content: t('common.music.not_in_voice', locale),
        ephemeral: true
      });
      return;
    }

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      await interaction.reply({
        content: t('common.music.nothing_playing', locale),
        ephemeral: true
      });
      return;
    }

    const botVoiceChannel = interaction.guild.members.me?.voice.channel;
    if (botVoiceChannel && botVoiceChannel.id !== voiceChannel.id) {
      await interaction.reply({
        content: t('common.music.different_voice', locale),
        ephemeral: true
      });
      return;
    }

    if (!queue.isPaused) {
      await interaction.reply({
        content: t('commands.resume.not_paused', locale),
        ephemeral: true
      });
      return;
    }

    const success = musicManager.resume(interaction.guild.id);

    if (success) {
      await interaction.reply(t('commands.resume.success', locale));
    } else {
      await interaction.reply({
        content: t('commands.resume.failed', locale),
        ephemeral: true
      });
    }
  }
};

export default command;
