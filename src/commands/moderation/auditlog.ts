import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder, User } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('auditlog')
    .setDescription('View and manage audit logs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View recent audit logs')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of logs to show (1-50)')
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('user')
        .setDescription('View audit logs for a specific user')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('The user to view logs for')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of logs to show (1-50)')
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('moderator')
        .setDescription('View audit logs by a specific moderator')
        .addUserOption(option =>
          option
            .setName('moderator')
            .setDescription('The moderator to view logs for')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of logs to show (1-50)')
            .setMinValue(1)
            .setMaxValue(50)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Set the audit log channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to send audit logs to')
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    if (!interaction.guildId) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const db = DatabaseManager.getInstance();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const limit = interaction.options.getInteger('limit') || 10;
      const logs = db.getAuditLogs(interaction.guildId, limit) as any[];

      if (logs.length === 0) {
        await interaction.reply({
          content: t('commands.auditlog.no_logs', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.auditlog.title', locale))
        .setDescription(t('commands.auditlog.showing', locale, { count: logs.length.toString() }))
        .setTimestamp();

      for (const log of logs.slice(0, 10)) {
        const timestamp = `<t:${log.timestamp}:R>`;
        const moderator = `<@${log.moderator_id}>`;
        const target = log.target_id ? `<@${log.target_id}>` : 'N/A';
        const reason = log.reason || t('commands.auditlog.no_reason', locale);

        embed.addFields({
          name: `${log.action_type} - ${timestamp}`,
          value: `**${t('commands.auditlog.moderator_label', locale)}:** ${moderator}\n**${t('commands.auditlog.target_label', locale)}:** ${target}\n**${t('commands.auditlog.reason_label', locale)}:** ${reason}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (subcommand === 'user') {
      const user = interaction.options.getUser('target', true);
      const limit = interaction.options.getInteger('limit') || 10;
      const logs = db.getAuditLogsByTarget(interaction.guildId, user.id, limit) as any[];

      if (logs.length === 0) {
        await interaction.reply({
          content: t('commands.auditlog.no_logs_user', locale, { user: user.tag }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.auditlog.title_user', locale, { user: user.tag }))
        .setDescription(t('commands.auditlog.showing_user', locale, { count: logs.length.toString() }))
        .setThumbnail(user.displayAvatarURL())
        .setTimestamp();

      for (const log of logs.slice(0, 10)) {
        const timestamp = `<t:${log.timestamp}:R>`;
        const moderator = `<@${log.moderator_id}>`;
        const reason = log.reason || t('commands.auditlog.no_reason', locale);

        embed.addFields({
          name: `${log.action_type} - ${timestamp}`,
          value: `**${t('commands.auditlog.moderator_label', locale)}:** ${moderator}\n**${t('commands.auditlog.reason_label', locale)}:** ${reason}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (subcommand === 'moderator') {
      const moderator = interaction.options.getUser('moderator', true);
      const limit = interaction.options.getInteger('limit') || 10;
      const logs = db.getAuditLogsByModerator(interaction.guildId, moderator.id, limit) as any[];

      if (logs.length === 0) {
        await interaction.reply({
          content: t('commands.auditlog.no_logs_moderator', locale, { moderator: moderator.tag }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.auditlog.title_moderator', locale, { moderator: moderator.tag }))
        .setDescription(t('commands.auditlog.showing_moderator', locale, { count: logs.length.toString() }))
        .setThumbnail(moderator.displayAvatarURL())
        .setTimestamp();

      for (const log of logs.slice(0, 10)) {
        const timestamp = `<t:${log.timestamp}:R>`;
        const target = log.target_id ? `<@${log.target_id}>` : 'N/A';
        const reason = log.reason || t('commands.auditlog.no_reason', locale);

        embed.addFields({
          name: `${log.action_type} - ${timestamp}`,
          value: `**${t('commands.auditlog.target_label', locale)}:** ${target}\n**${t('commands.auditlog.reason_label', locale)}:** ${reason}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (subcommand === 'setchannel') {
      const channel = interaction.options.getChannel('channel', true);

      db.updateGuild(interaction.guildId, { audit_log_channel_id: channel.id });

      await interaction.reply({
        content: t('commands.auditlog.channel_set', locale, { channel: `${channel}` }),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
