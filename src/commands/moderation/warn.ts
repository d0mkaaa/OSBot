import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  TextChannel
} from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a warning to a user')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('User to warn')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for warning')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('rule')
            .setDescription('Rule number they violated')
            .setRequired(false)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List warnings for a user')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('User to check')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a warning from a user')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('User to remove warning from')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('case')
            .setDescription('Case ID to remove')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear all warnings for a user')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('User to clear warnings for')
            .setRequired(true)
        )
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

    const db = DatabaseManager.getInstance();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const targetUser = interaction.options.getUser('target', true);
      const customReason = interaction.options.getString('reason');
      const ruleNumber = interaction.options.getInteger('rule');

      let reason = customReason || t('commands.warn.no_reason', locale);
      let ruleId: number | undefined;

      if (ruleNumber) {
        const rule = db.getRule(interaction.guild.id, ruleNumber) as any;
        if (!rule) {
          await interaction.reply({
            content: t('commands.warn.rule_not_found', locale, { rule: ruleNumber.toString() }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        ruleId = rule.id;
        reason = customReason || t('commands.warn.rule_violation', locale, { rule: ruleNumber.toString(), title: rule.title });
      } else if (!customReason) {
        await interaction.reply({
          content: t('commands.warn.must_provide_reason', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.createGuild(interaction.guild.id);
      db.createUser(targetUser.id, targetUser.tag);
      db.addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason, ruleId);

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MEMBER_WARN',
        moderator: interaction.user,
        target: targetUser,
        reason,
        details: ruleId ? { rule: ruleId } : undefined
      });

      const warnings = db.getWarnings(interaction.guild.id, targetUser.id) as any[];

      const guildData = db.getGuild(interaction.guild.id) as any;
      if (guildData?.warning_threshold_enabled) {
        const threshold = guildData.warning_threshold_count || 3;
        const action = guildData.warning_threshold_action || 'mute';
        const duration = guildData.warning_threshold_duration || 3600;

        if (warnings.length >= threshold) {
          const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

          if (member) {
            try {
              if (action === 'mute') {
                await member.timeout(duration * 1000, t('commands.warn.threshold_reason', locale, { count: warnings.length.toString() }));
                await interaction.followUp({
                  content: t('commands.warn.threshold_muted', locale, { user: `${targetUser}`, minutes: Math.floor(duration / 60).toString(), threshold: threshold.toString() }),
                  flags: MessageFlags.Ephemeral
                });
              } else if (action === 'kick') {
                await member.kick(t('commands.warn.threshold_reason', locale, { count: warnings.length.toString() }));
                await interaction.followUp({
                  content: t('commands.warn.threshold_kicked', locale, { user: `${targetUser}`, threshold: threshold.toString() }),
                  flags: MessageFlags.Ephemeral
                });
              } else if (action === 'ban') {
                await member.ban({ reason: t('commands.warn.threshold_reason', locale, { count: warnings.length.toString() }) });
                await interaction.followUp({
                  content: t('commands.warn.threshold_banned', locale, { user: `${targetUser}`, threshold: threshold.toString() }),
                  flags: MessageFlags.Ephemeral
                });
              }
            } catch (error) {
              logger.error('Failed to execute warning threshold action', error);
            }
          }
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle(t('commands.warn.warned_title', locale))
        .setDescription(t('commands.warn.warned_description', locale, { user: targetUser.toString() }))
        .addFields(
          { name: t('commands.warn.reason', locale), value: reason, inline: false }
        );

      if (ruleNumber) {
        embed.addFields({ name: t('commands.warn.rule_violated', locale), value: t('commands.warn.rule_number', locale, { rule: ruleNumber.toString() }), inline: true });
      }

      embed.addFields(
        { name: t('commands.warn.total_warnings', locale), value: warnings.length.toString(), inline: true },
        { name: t('commands.warn.warned_by', locale), value: interaction.user.toString(), inline: true }
      ).setTimestamp();

      await interaction.reply({ embeds: [embed] });

      try {
        await targetUser.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0xFFFF00)
              .setTitle(t('commands.warn.dm_title', locale, { server: interaction.guild.name }))
              .setDescription(t('commands.warn.dm_description', locale, { reason, count: warnings.length.toString() }))
              .setTimestamp()
          ]
        });
      } catch (error) {
        logger.warn('Could not DM user about warning');
      }

      if (guildData?.mod_log_channel_id) {
        const modLogChannel = interaction.guild.channels.cache.get(guildData.mod_log_channel_id) as TextChannel;
        if (modLogChannel?.isTextBased()) {
          try {
            const logEmbed = new EmbedBuilder()
              .setColor(0xFFFF00)
              .setTitle(t('commands.warn.log_title', locale))
              .addFields(
                { name: t('commands.warn.log_user', locale), value: `${targetUser.toString()} (${targetUser.id})`, inline: true },
                { name: t('commands.warn.log_moderator', locale), value: `${interaction.user.toString()} (${interaction.user.id})`, inline: true },
                { name: t('commands.warn.log_reason', locale), value: reason, inline: false }
              );

            if (ruleNumber) {
              logEmbed.addFields({ name: t('commands.warn.log_rule_violated', locale), value: t('commands.warn.rule_number', locale, { rule: ruleNumber.toString() }), inline: true });
            }

            logEmbed.addFields(
              { name: t('commands.warn.log_total_warnings', locale), value: warnings.length.toString(), inline: true },
              { name: t('commands.warn.log_timestamp', locale), value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
            )
              .setFooter({ text: t('commands.warn.log_case_id', locale, { id: warnings[0].id.toString() }) })
              .setTimestamp();

            await modLogChannel.send({ embeds: [logEmbed] });
          } catch (error) {
            logger.error('Failed to send warning to mod log channel', error);
          }
        }
      }

      return;
    }

    if (subcommand === 'list') {
      const targetUser = interaction.options.getUser('target', true);
      const warnings = db.getWarnings(interaction.guild.id, targetUser.id) as any[];

      if (warnings.length === 0) {
        await interaction.reply({
          content: t('commands.warn.no_warnings', locale, { user: targetUser.tag }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle(t('commands.warn.list_title', locale, { user: targetUser.tag }))
        .setDescription(t('commands.warn.list_total', locale, { count: warnings.length.toString() }))
        .setTimestamp();

      for (let i = 0; i < Math.min(warnings.length, 10); i++) {
        const warning = warnings[i];
        const moderator = await interaction.client.users.fetch(warning.moderator_id).catch(() => null);
        const moderatorDisplay = moderator ? moderator.toString() : t('commands.warn.unknown_moderator', locale, { id: warning.moderator_id });

        let warningValue = `**${t('commands.warn.reason', locale)}:** ${warning.reason}\n`;
        if (warning.rule_number) {
          warningValue += `**${t('commands.warn.rule_violated', locale)}:** ${t('commands.warn.rule_number', locale, { rule: warning.rule_number.toString() })} - ${warning.rule_title}\n`;
        }
        warningValue += `**${t('commands.warn.warned_by', locale)}:** ${moderatorDisplay}\n`;
        warningValue += `**${t('commands.warn.date', locale)}:** <t:${warning.created_at}:F> (<t:${warning.created_at}:R>)`;

        embed.addFields({
          name: t('commands.warn.warning_entry', locale, { number: (i + 1).toString(), case: warning.id.toString() }),
          value: warningValue,
          inline: false
        });
      }

      if (warnings.length > 10) {
        embed.setFooter({ text: t('commands.warn.showing_count', locale, { count: warnings.length.toString() }) });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'remove') {
      const targetUser = interaction.options.getUser('target', true);
      const caseId = interaction.options.getInteger('case', true);

      const warnings = db.getWarnings(interaction.guild.id, targetUser.id) as any[];
      const warning = warnings.find((w: any) => w.id === caseId);

      if (!warning) {
        await interaction.reply({
          content: t('commands.warn.case_not_found', locale, { case: caseId.toString(), user: targetUser.tag }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.removeWarning(caseId);

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MEMBER_WARN',
        moderator: interaction.user,
        target: targetUser,
        reason: 'Warning removed',
        details: { caseId: caseId.toString(), action: 'remove' }
      });

      await interaction.reply({
        content: t('commands.warn.removed', locale, { case: caseId.toString(), user: targetUser.tag }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'clear') {
      const targetUser = interaction.options.getUser('target', true);
      const warnings = db.getWarnings(interaction.guild.id, targetUser.id) as any[];

      if (warnings.length === 0) {
        await interaction.reply({
          content: t('commands.warn.no_warnings_to_clear', locale, { user: targetUser.tag }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.clearWarnings(interaction.guild.id, targetUser.id);

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MEMBER_WARN',
        moderator: interaction.user,
        target: targetUser,
        reason: 'All warnings cleared',
        details: { count: warnings.length.toString(), action: 'clear' }
      });

      await interaction.reply({
        content: t('commands.warn.cleared', locale, { count: warnings.length.toString(), plural: warnings.length === 1 ? '' : 's', user: targetUser.tag }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }
  }
};

export default command;
