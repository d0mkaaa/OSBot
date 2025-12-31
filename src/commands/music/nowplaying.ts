import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';
import { formatDuration } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.editReply({
        content: t('common.errors.guild_only', locale)
      });
      return;
    }

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.currentTrack) {
      await interaction.editReply({
        content: t('common.music.nothing_playing', locale)
      });
      return;
    }

    const track = queue.currentTrack;

    const requestedByText = typeof track.requestedBy === 'string'
      ? track.requestedBy
      : track.requestedBy.tag;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.nowplaying.title', locale))
      .setDescription(`**[${track.title}](${track.url})**`)
      .setThumbnail(track.thumbnail || null)
      .addFields(
        {
          name: t('commands.nowplaying.requested_by', locale),
          value: requestedByText,
          inline: true
        },
        {
          name: t('commands.nowplaying.duration', locale),
          value: formatDuration(track.duration),
          inline: true
        },
        {
          name: t('commands.nowplaying.volume', locale),
          value: `${queue.volume}%`,
          inline: true
        }
      )
      .setTimestamp();

    const loopText = queue.loopMode === 'track'
      ? t('commands.nowplaying.loop_song', locale)
      : queue.loopMode === 'queue'
      ? t('commands.nowplaying.loop_queue', locale)
      : t('commands.nowplaying.loop_off', locale);

    embed.addFields({
      name: t('commands.nowplaying.loop_mode', locale),
      value: loopText,
      inline: true
    });

    if (queue.tracks.length > 0) {
      embed.addFields({
        name: t('commands.nowplaying.up_next', locale),
        value: `**[${queue.tracks[0].title}](${queue.tracks[0].url})**`,
        inline: false
      });
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
