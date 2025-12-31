import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a song from the queue')
    .addIntegerOption(option =>
      option
        .setName('position')
        .setDescription('Position in queue to remove')
        .setRequired(true)
        .setMinValue(1)
    ),

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

    if (!queue || queue.tracks.length === 0) {
      await interaction.reply({
        content: t('common.music.queue_empty', locale),
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

    const position = interaction.options.getInteger('position', true);

    if (position > queue.tracks.length) {
      await interaction.reply({
        content: t('commands.remove.invalid_position', locale, {
          max: queue.tracks.length.toString()
        }),
        ephemeral: true
      });
      return;
    }

    const removedTrack = musicManager.removeTrack(interaction.guild.id, position - 1);

    if (!removedTrack) {
      await interaction.reply({
        content: t('commands.remove.failed', locale),
        ephemeral: true
      });
      return;
    }

    await interaction.reply(
      t('commands.remove.success', locale, {
        title: removedTrack.title,
        position: position.toString()
      })
    );
  }
};

export default command;
