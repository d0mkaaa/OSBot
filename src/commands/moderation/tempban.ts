import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily ban a user from the server')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to temporarily ban')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Duration in hours (1-720 hours / 30 days)')
        .setMinValue(1)
        .setMaxValue(720)
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for the temporary ban')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete_days')
        .setDescription('Number of days of messages to delete (0-7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || t('commands.tempban.no_reason', locale);
    const deleteDays = interaction.options.getInteger('delete_days') || 1;

    if (user.id === interaction.user.id) {
      await interaction.reply({
        content: t('commands.tempban.cannot_ban_self', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (user.id === interaction.client.user.id) {
      await interaction.reply({
        content: t('commands.tempban.cannot_ban_bot', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      if (member) {
        const botMember = await interaction.guild.members.fetch(interaction.client.user.id);
        const executorMember = interaction.member;

        if (member.roles.highest.position >= (executorMember as any).roles.highest.position) {
          await interaction.reply({
            content: t('commands.tempban.higher_role', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (member.roles.highest.position >= botMember.roles.highest.position) {
          await interaction.reply({
            content: t('commands.tempban.bot_higher_role', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        try {
          await user.send(
            t('commands.tempban.dm_message', locale, {
              server: interaction.guild.name,
              duration: duration.toString(),
              reason
            })
          );
        } catch {
        }
      }

      const expiresAt = Math.floor(Date.now() / 1000) + (duration * 3600);

      await interaction.guild.bans.create(user.id, {
        deleteMessageSeconds: deleteDays * 86400,
        reason: `Tempban by ${interaction.user.tag} for ${duration}h: ${reason}`
      });

      const db = DatabaseManager.getInstance();
      db.addTempban(interaction.guild.id, user.id, interaction.user.id, expiresAt, reason);

      const caseNumber = db.createCase(
        interaction.guild.id,
        'Tempban',
        user.id,
        interaction.user.id,
        reason,
        duration * 3600
      );

      await auditLogger.log({
        guild: interaction.guild,
        action: 'Tempban',
        moderator: interaction.user,
        target: user,
        reason,
        details: {
          duration: `${duration} hour(s)`,
          expiresAt: `<t:${expiresAt}:F>`,
          deletedMessages: `${deleteDays} day(s)`,
          caseNumber
        }
      });

      await interaction.reply({
        content: t('commands.tempban.success', locale, {
          user: user.tag,
          duration: duration.toString(),
          reason,
          expires: `<t:${expiresAt}:R>`,
          case: caseNumber.toString()
        }),
        flags: MessageFlags.Ephemeral
      });
    } catch (error: any) {
      await interaction.reply({
        content: t('commands.tempban.failed', locale, { error: error.message }),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
