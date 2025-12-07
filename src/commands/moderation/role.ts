import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags, Role } from 'discord.js';
import { Command } from '../../types/index.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a role to a member')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('The member to add the role to')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to add')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a role from a member')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('The member to remove the role from')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('The role to remove')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

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
    const targetUser = interaction.options.getUser('target', true);
    const roleOption = interaction.options.getRole('role', true);

    if (!(roleOption instanceof Role)) {
      await interaction.reply({
        content: t('commands.role.invalid_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const role = roleOption;

    let member: GuildMember | undefined;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      await interaction.reply({
        content: t('commands.role.not_in_server', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const executor = interaction.member as GuildMember;
    const botMember = interaction.guild.members.me!;

    if (role.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: t('commands.role.higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (role.position >= botMember.roles.highest.position) {
      await interaction.reply({
        content: t('commands.role.bot_higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (role.managed) {
      await interaction.reply({
        content: t('commands.role.managed_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      if (subcommand === 'add') {
        if (member.roles.cache.has(role.id)) {
          await interaction.reply({
            content: t('commands.role.already_has', locale, { user: targetUser.tag, role: role.name }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await member.roles.add(role);
        await interaction.reply(
          t('commands.role.added', locale, { role: role.name, user: targetUser.tag })
        );

        await auditLogger.log({
          guild: interaction.guild,
          action: 'MEMBER_ROLE_ADD',
          moderator: interaction.user,
          target: targetUser,
          details: { role: role.name }
        });
      } else {
        if (!member.roles.cache.has(role.id)) {
          await interaction.reply({
            content: t('commands.role.doesnt_have', locale, { user: targetUser.tag, role: role.name }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await member.roles.remove(role);
        await interaction.reply(
          t('commands.role.removed', locale, { role: role.name, user: targetUser.tag })
        );

        await auditLogger.log({
          guild: interaction.guild,
          action: 'MEMBER_ROLE_REMOVE',
          moderator: interaction.user,
          target: targetUser,
          details: { role: role.name }
        });
      }
    } catch (error) {
      await interaction.reply({
        content: t('commands.role.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
