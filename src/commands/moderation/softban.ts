import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { AuditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a user to delete their messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('User to softban')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('days')
        .setDescription('Number of days of messages to delete (default: 7)')
        .setMinValue(1)
        .setMaxValue(7)
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for softban')
        .setRequired(false)
    ),

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
    const days = interaction.options.getInteger('days') || 7;
    const reason = interaction.options.getString('reason') || t('commands.softban.no_reason', locale);

    if (user.id === interaction.user.id) {
      await interaction.reply({
        content: t('commands.softban.cannot_softban_self', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (user.id === interaction.client.user?.id) {
      await interaction.reply({
        content: t('commands.softban.cannot_softban_bot', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      if (member.id === interaction.guild.ownerId) {
        await interaction.reply({
          content: t('commands.softban.cannot_softban_owner', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const botMember = await interaction.guild.members.fetchMe();
      if (member.roles.highest.position >= botMember.roles.highest.position) {
        await interaction.reply({
          content: t('commands.softban.bot_higher_role', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const memberRoles = interaction.member?.roles as GuildMember['roles'];
      if ('highest' in memberRoles && member.roles.highest.position >= memberRoles.highest.position) {
        await interaction.reply({
          content: t('commands.softban.higher_role', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    try {
      try {
        await user.send(
          t('commands.softban.dm_message', locale, {
            server: interaction.guild.name,
            reason: reason,
            days: days.toString(),
            plural: days === 1 ? '' : 's'
          })
        );
      } catch {
      }

      await interaction.guild.bans.create(user.id, {
        deleteMessageSeconds: days * 86400,
        reason: `Softban by ${interaction.user.tag}: ${reason}`
      });

      await interaction.guild.bans.remove(user.id, `Softban unban by ${interaction.user.tag}`);

      const auditLogger = new AuditLogger();
      await auditLogger.log({
        guild: interaction.guild,
        action: 'Softban',
        moderator: interaction.user,
        target: user,
        reason,
        details: { messageDays: days }
      });

      await interaction.reply({
        content: t('commands.softban.success', locale, {
          user: user.tag,
          reason: reason,
          days: days.toString(),
          plural: days === 1 ? '' : 's'
        }),
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: t('commands.softban.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
