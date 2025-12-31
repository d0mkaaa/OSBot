import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the queue'),

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

    if (queue.tracks.length < 2) {
      await interaction.reply({
        content: t('commands.shuffle.not_enough_tracks', locale),
        ephemeral: true
      });
      return;
    }

    musicManager.shuffle(interaction.guild.id);

    await interaction.reply(
      t('commands.shuffle.success', locale, {
        count: queue.tracks.length.toString()
      })
    );
  }
};

export default command;
