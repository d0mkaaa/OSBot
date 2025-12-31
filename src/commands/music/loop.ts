import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set the loop mode')
    .addStringOption(option =>
      option
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: 'off' },
          { name: 'Track', value: 'track' },
          { name: 'Queue', value: 'queue' }
        )
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

    const mode = interaction.options.getString('mode', true) as 'off' | 'track' | 'queue';

    musicManager.setLoop(interaction.guild.id, mode);

    const loopEmoji = mode === 'track' ? '🔂' : mode === 'queue' ? '🔁' : '▶️';

    await interaction.reply(
      t('commands.loop.success', locale, {
        mode: t(`commands.loop.mode_${mode}`, locale),
        emoji: loopEmoji
      })
    );
  }
};

export default command;
