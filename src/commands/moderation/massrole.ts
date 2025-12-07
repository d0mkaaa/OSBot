import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, Role } from 'discord.js';
import { Command } from '../../types/index.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('massrole')
    .setDescription('Add or remove a role from multiple users')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a role to all members or specific criteria')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to add')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('filter')
            .setDescription('Only add to members with this role')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('bots')
            .setDescription('Include bots (default: false)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a role from all members or specific criteria')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to remove')
            .setRequired(true)
        )
        .addRoleOption(option =>
          option
            .setName('filter')
            .setDescription('Only remove from members with this role')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('bots')
            .setDescription('Include bots (default: false)')
            .setRequired(false)
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

    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();
    const roleOption = interaction.options.getRole('role', true);
    const filterRoleOption = interaction.options.getRole('filter');
    const includeBots = interaction.options.getBoolean('bots') || false;

    if (!(roleOption instanceof Role)) {
      await interaction.editReply({
        content: t('commands.massrole.role_resolve_failed', locale)
      });
      return;
    }

    const role = roleOption;
    const filterRole = filterRoleOption instanceof Role ? filterRoleOption : null;

    const botMember = await interaction.guild.members.fetchMe();

    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.editReply(t('commands.massrole.bot_no_permission', locale));
      return;
    }

    if (role.position >= botMember.roles.highest.position) {
      await interaction.editReply(t('commands.massrole.bot_higher_role', locale));
      return;
    }

    const memberRole = interaction.member?.roles;
    if (memberRole && 'highest' in memberRole && role.position >= memberRole.highest.position) {
      await interaction.editReply(t('commands.massrole.higher_role', locale));
      return;
    }

    try {
      await interaction.guild.members.fetch();

      let members = interaction.guild.members.cache.filter(member => {
        if (!includeBots && member.user.bot) return false;
        if (filterRole && !member.roles.cache.has(filterRole.id)) return false;
        return true;
      });

      let successCount = 0;
      let failCount = 0;

      await interaction.editReply(t('commands.massrole.processing', locale, { count: members.size.toString() }));

      for (const [, member] of members) {
        try {
          if (subcommand === 'add') {
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role);
              successCount++;
            }
          } else if (subcommand === 'remove') {
            if (member.roles.cache.has(role.id)) {
              await member.roles.remove(role);
              successCount++;
            }
          }

          if ((successCount + failCount) % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          failCount++;
          logger.error(`Failed to ${subcommand} role for ${member.user.tag}`, error);
        }
      }

      const successMessage = subcommand === 'add'
        ? t('commands.massrole.success_add', locale, {
            role: `${role}`,
            count: successCount.toString(),
            plural: successCount === 1 ? '' : 's'
          })
        : t('commands.massrole.success_remove', locale, {
            role: `${role}`,
            count: successCount.toString(),
            plural: successCount === 1 ? '' : 's'
          });

      const partialMessage = failCount > 0
        ? t('commands.massrole.partial', locale, {
            count: failCount.toString(),
            plural: failCount === 1 ? '' : 's'
          })
        : '';

      await interaction.editReply(successMessage + partialMessage);

      await auditLogger.log({
        guild: interaction.guild,
        action: subcommand === 'add' ? 'MEMBER_ROLE_ADD' : 'MEMBER_ROLE_REMOVE',
        moderator: interaction.user,
        reason: `Mass ${subcommand} operation`,
        details: {
          role: role.name,
          affected: `${successCount} members`,
          filter: filterRole ? filterRole.name : 'all members',
          includeBots: includeBots ? 'yes' : 'no'
        }
      });
    } catch (error) {
      logger.error('Mass role command failed', error);
      await interaction.editReply(t('commands.massrole.failed', locale));
    }
  }
};

export default command;
