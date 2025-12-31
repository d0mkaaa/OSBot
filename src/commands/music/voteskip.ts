import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { MusicManager } from '../../music/MusicManager.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('voteskip')
    .setDescription('Vote to skip the current song')
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({ content: t('common.errors.guild_only', locale), ephemeral: true });
      return;
    }

    const db = DatabaseManager.getInstance();
    const musicSettings = db.getOrCreateMusicSettings(interaction.guild.id);

    if (!musicSettings.enabled) {
      await interaction.reply({ content: t('commands.music.disabled', locale), ephemeral: true });
      return;
    }

    if (!musicSettings.vote_skip_enabled) {
      await interaction.reply({ content: t('commands.voteskip.disabled', locale), ephemeral: true });
      return;
    }

    const musicManager = MusicManager.getInstance();
    const queue = musicManager.getQueue(interaction.guild.id);

    if (!queue || !queue.isPlaying) {
      await interaction.reply({ content: t('commands.music.nothing_playing', locale), ephemeral: true });
      return;
    }

    const member = interaction.guild.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;

    if (!voiceChannel) {
      await interaction.reply({ content: t('commands.music.not_in_voice', locale), ephemeral: true });
      return;
    }

    const botVoiceChannel = interaction.guild.members.me?.voice.channel;
    if (!botVoiceChannel || voiceChannel.id !== botVoiceChannel.id) {
      await interaction.reply({ content: t('commands.music.different_voice', locale), ephemeral: true });
      return;
    }

    const memberCount = voiceChannel.members.filter(m => !m.user.bot).size;
    const result = musicManager.addVoteSkip(interaction.guild.id, interaction.user.id, memberCount);

    if (!result.voted) {
      await interaction.reply({ content: t('commands.voteskip.error', locale), ephemeral: true });
      return;
    }

    if (result.votes >= result.required) {
      await interaction.reply({
        content: t('commands.voteskip.skipped', locale, {
          votes: result.votes.toString(),
          required: result.required.toString()
        })
      });
    } else {
      await interaction.reply({
        content: t('commands.voteskip.voted', locale, {
          votes: result.votes.toString(),
          required: result.required.toString()
        })
      });
    }
  }
};

export default command;
