import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set or view the music volume')
    .addIntegerOption(option =>
      option
        .setName('level')
        .setDescription('Volume level (0-100)')
        .setMinValue(0)
        .setMaxValue(100)
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

    if (!queue) {
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

    const volume = interaction.options.getInteger('level');

    if (volume === null) {
      await interaction.reply(
        t('commands.volume.current', locale, { volume: queue.volume.toString() })
      );
      return;
    }

    musicManager.setVolume(interaction.guild.id, volume);

    const volumeEmoji = volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊';

    await interaction.reply(
      t('commands.volume.success', locale, {
        volume: volume.toString(),
        emoji: volumeEmoji
      })
    );
  }
};

export default command;
