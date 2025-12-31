import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';
import { formatDuration } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('View the current music queue')
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number')
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

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || (!queue.currentTrack && queue.tracks.length === 0)) {
      await interaction.reply({
        content: t('commands.queue.empty', locale),
        ephemeral: true
      });
      return;
    }

    const page = interaction.options.getInteger('page') || 1;
    const tracksPerPage = 10;
    const totalPages = Math.ceil(queue.tracks.length / tracksPerPage);

    if (page > totalPages && totalPages > 0) {
      await interaction.reply({
        content: t('commands.queue.invalid_page', locale, {
          total: totalPages.toString()
        }),
        ephemeral: true
      });
      return;
    }

    const startIndex = (page - 1) * tracksPerPage;
    const endIndex = startIndex + tracksPerPage;
    const tracksToShow = queue.tracks.slice(startIndex, endIndex);

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.queue.title', locale, { guild: interaction.guild.name }))
      .setTimestamp();

    if (queue.currentTrack) {
      const np = queue.currentTrack;
      embed.addFields({
        name: t('commands.queue.now_playing', locale),
        value: `**[${np.title}](${np.url})**\n${t('commands.queue.requested_by', locale)}: ${np.requestedBy} | ${t('commands.queue.duration', locale)}: ${formatDuration(np.duration)}`
      });
    }

    if (tracksToShow.length > 0) {
      const queueList = tracksToShow.map((track, index) => {
        const position = startIndex + index + 1;
        return `**${position}.** [${track.title}](${track.url}) - ${formatDuration(track.duration)} | ${track.requestedBy}`;
      }).join('\n');

      embed.addFields({
        name: t('commands.queue.up_next', locale),
        value: queueList
      });
    }

    const totalDuration = queue.tracks.reduce((acc, track) => acc + track.duration, queue.currentTrack ? queue.currentTrack.duration : 0);
    const loopEmoji = queue.loopMode === 'track' ? '🔂' : queue.loopMode === 'queue' ? '🔁' : '';
    const volumeEmoji = queue.volume === 0 ? '🔇' : queue.volume < 50 ? '🔉' : '🔊';

    embed.setFooter({
      text: t('commands.queue.footer', locale, {
        count: queue.tracks.length.toString(),
        duration: formatDuration(totalDuration),
        page: page.toString(),
        total: totalPages.toString() || '1',
        loop: loopEmoji,
        volume: `${volumeEmoji} ${queue.volume}%`
      })
    });

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
