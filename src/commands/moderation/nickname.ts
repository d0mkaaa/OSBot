import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { AuditLogger } from '../../utils/audit-logger.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('nickname')
    .setDescription('Manage member nicknames')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set a member\'s nickname')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to set nickname for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('nickname')
            .setDescription('New nickname')
            .setRequired(true)
            .setMaxLength(32)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for nickname change')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Reset a member\'s nickname to their username')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to reset nickname for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for nickname reset')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Lock a member\'s nickname (resets it if they change it)')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to lock nickname for')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('nickname')
            .setDescription('Nickname to lock (leave empty to lock current)')
            .setRequired(false)
            .setMaxLength(32)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unlock')
        .setDescription('Unlock a member\'s nickname')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('User to unlock nickname for')
            .setRequired(true)
        )
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

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || t('commands.nickname.no_reason', locale);

    const botMember = await interaction.guild.members.fetchMe();

    if (!botMember.permissions.has(PermissionFlagsBits.ManageNicknames)) {
      await interaction.reply({
        content: t('commands.nickname.bot_no_permission', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        content: t('commands.nickname.user_not_found', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (targetMember.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: t('commands.nickname.cannot_change_owner', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: t('commands.nickname.bot_higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const memberRoles = interaction.member?.roles;
    if (memberRoles && 'highest' in memberRoles && targetMember.roles.highest.position >= memberRoles.highest.position) {
      await interaction.reply({
        content: t('commands.nickname.higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      const auditLogger = new AuditLogger();

      if (subcommand === 'set') {
        const nickname = interaction.options.getString('nickname', true);
        const oldNickname = targetMember.nickname || targetMember.user.username;

        await targetMember.setNickname(nickname, reason);

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Nickname Changed',
          moderator: interaction.user,
          target: targetMember.user,
          reason,
          details: { old: oldNickname, new: nickname }
        });

        await interaction.reply({
          content: t('commands.nickname.set_success', locale, { user: `${user}`, nickname }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'reset') {
        const oldNickname = targetMember.nickname || targetMember.user.username;

        await targetMember.setNickname(null, reason);

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Nickname Reset',
          moderator: interaction.user,
          target: targetMember.user,
          reason,
          details: { old: oldNickname }
        });

        await interaction.reply({
          content: t('commands.nickname.reset_success', locale, { user: `${user}` }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'lock') {
        const nickname = interaction.options.getString('nickname') || targetMember.nickname || targetMember.user.username;

        await targetMember.setNickname(nickname, 'Nickname locked');

        const db = DatabaseManager.getInstance();
        db.lockNickname(interaction.guild.id, targetMember.id, nickname, interaction.user.id);

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Nickname Locked',
          moderator: interaction.user,
          target: targetMember.user,
          reason: `Locked to: ${nickname}`,
          details: { locked_nickname: nickname }
        });

        await interaction.reply({
          content: t('commands.nickname.lock_success', locale, { user: `${user}`, nickname }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'unlock') {
        const db = DatabaseManager.getInstance();
        const lockedData = db.getLockedNickname(interaction.guild.id, targetMember.id) as any;

        if (!lockedData) {
          await interaction.reply({
            content: t('commands.nickname.not_locked', locale, { user: `${user}` }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        db.unlockNickname(interaction.guild.id, targetMember.id);

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Nickname Unlocked',
          moderator: interaction.user,
          target: targetMember.user,
          reason: `Previously locked to: ${lockedData.locked_nickname}`
        });

        await interaction.reply({
          content: t('commands.nickname.unlock_success', locale, { user: `${user}` }),
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      await interaction.reply({
        content: t('commands.nickname.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
