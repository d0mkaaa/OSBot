import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { sendModLog } from '../../utils/mod-log.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to timeout')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in minutes (1-10080)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for the timeout')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || t('commands.mute.no_reason', locale);

    let member: GuildMember | undefined;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      await interaction.reply({
        content: t('commands.mute.not_in_server', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: t('commands.mute.cannot_mute_self', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: t('commands.mute.cannot_mute_owner', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: t('commands.mute.higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!member.moderatable) {
      await interaction.reply({
        content: t('commands.mute.bot_higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await member.timeout(duration * 60 * 1000, reason);

      const durationText = duration < 60
        ? `${duration} minute${duration === 1 ? '' : 's'}`
        : `${Math.floor(duration / 60)} hour${Math.floor(duration / 60) === 1 ? '' : 's'}`;

      await interaction.reply(
        t('commands.mute.success', locale, {
          user: targetUser.tag,
          duration: durationText,
          reason: reason ? `\n${t('commands.mute.reason_label', locale)}: ${reason}` : ''
        })
      );

      await sendModLog(
        interaction.guild,
        'Mute',
        interaction.user,
        targetUser,
        reason,
        [{ name: '⏰ Duration', value: durationText, inline: true }]
      );

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MEMBER_TIMEOUT',
        moderator: interaction.user,
        target: targetUser,
        reason,
        details: { duration: durationText }
      });
    } catch (error) {
      await interaction.reply({
        content: t('commands.mute.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
