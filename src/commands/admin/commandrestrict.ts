import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  GuildChannel
} from 'discord.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const AVAILABLE_PERMISSIONS = [
  'ManageGuild',
  'ManageChannels',
  'ManageRoles',
  'ManageMessages',
  'KickMembers',
  'BanMembers',
  'ModerateMembers'
] as const;

export default {
  data: new SlashCommandBuilder()
    .setName('commandrestrict')
    .setDescription('Configure channel-based command restrictions')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('enable')
        .setDescription('Enable command restrictions')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disable')
        .setDescription('Disable command restrictions')
    )
    .addSubcommandGroup(group =>
      group
        .setName('channel')
        .setDescription('Manage blacklisted channels')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a channel to the blacklist')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('The channel to blacklist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove a channel from the blacklist')
            .addChannelOption(option =>
              option
                .setName('channel')
                .setDescription('The channel to remove from blacklist')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all blacklisted channels')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('role')
        .setDescription('Manage exception roles')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a role that can bypass restrictions')
            .addRoleOption(option =>
              option
                .setName('role')
                .setDescription('The role to add as exception')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove an exception role')
            .addRoleOption(option =>
              option
                .setName('role')
                .setDescription('The role to remove from exceptions')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all exception roles')
        )
    )
    .addSubcommandGroup(group =>
      group
        .setName('permission')
        .setDescription('Manage exception permissions')
        .addSubcommand(subcommand =>
          subcommand
            .setName('add')
            .setDescription('Add a permission that can bypass restrictions')
            .addStringOption(option =>
              option
                .setName('permission')
                .setDescription('The permission to add as exception')
                .setRequired(true)
                .addChoices(
                  ...AVAILABLE_PERMISSIONS.map(p => ({ name: p, value: p }))
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('remove')
            .setDescription('Remove an exception permission')
            .addStringOption(option =>
              option
                .setName('permission')
                .setDescription('The permission to remove from exceptions')
                .setRequired(true)
                .addChoices(
                  ...AVAILABLE_PERMISSIONS.map(p => ({ name: p, value: p }))
                )
            )
        )
        .addSubcommand(subcommand =>
          subcommand
            .setName('list')
            .setDescription('List all exception permissions')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('View current restriction configuration')
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) return;

    const locale = getInteractionLocale(interaction);
    const db = DatabaseManager.getInstance();
    const guildId = interaction.guild.id;

    const subcommandGroup = interaction.options.data[0]?.type === 2
      ? interaction.options.data[0].name
      : null;
    const subcommand = subcommandGroup
      ? interaction.options.data[0].options?.[0]?.name
      : interaction.options.data[0]?.name;

    const restrictions = db.getOrCreateCommandRestrictions(guildId);

    if (subcommand === 'enable') {
      db.updateCommandRestrictions(guildId, { enabled: 1 });
      return interaction.reply({
        content: t('commands.commandrestrict.enabled', locale),
        ephemeral: true
      });
    }

    if (subcommand === 'disable') {
      db.updateCommandRestrictions(guildId, { enabled: 0 });
      return interaction.reply({
        content: t('commands.commandrestrict.disabled', locale),
        ephemeral: true
      });
    }

    if (subcommandGroup === 'channel') {
      const blacklistedChannels = restrictions.blacklisted_channels
        ? JSON.parse(restrictions.blacklisted_channels) as string[]
        : [];

      if (subcommand === 'add') {
        const channel = interaction.options.get('channel')?.channel as GuildChannel;
        if (!channel) return;

        if (blacklistedChannels.includes(channel.id)) {
          return interaction.reply({
            content: t('commands.commandrestrict.channel.already_blacklisted', locale, { channel: channel.name }),
            ephemeral: true
          });
        }

        blacklistedChannels.push(channel.id);
        db.updateCommandRestrictions(guildId, {
          blacklisted_channels: JSON.stringify(blacklistedChannels)
        });

        return interaction.reply({
          content: t('commands.commandrestrict.channel.added', locale, { channel: channel.name }),
          ephemeral: true
        });
      }

      if (subcommand === 'remove') {
        const channel = interaction.options.get('channel')?.channel as GuildChannel;
        if (!channel) return;

        const index = blacklistedChannels.indexOf(channel.id);
        if (index === -1) {
          return interaction.reply({
            content: t('commands.commandrestrict.channel.not_blacklisted', locale, { channel: channel.name }),
            ephemeral: true
          });
        }

        blacklistedChannels.splice(index, 1);
        db.updateCommandRestrictions(guildId, {
          blacklisted_channels: JSON.stringify(blacklistedChannels)
        });

        return interaction.reply({
          content: t('commands.commandrestrict.channel.removed', locale, { channel: channel.name }),
          ephemeral: true
        });
      }

      if (subcommand === 'list') {
        if (blacklistedChannels.length === 0) {
          return interaction.reply({
            content: t('commands.commandrestrict.channel.no_channels', locale),
            ephemeral: true
          });
        }

        const channelList = blacklistedChannels
          .map(id => `<#${id}>`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.commandrestrict.channel.list_title', locale))
          .setDescription(channelList);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    if (subcommandGroup === 'role') {
      const exceptionRoles = restrictions.exception_roles
        ? JSON.parse(restrictions.exception_roles) as string[]
        : [];

      if (subcommand === 'add') {
        const role = interaction.options.get('role')?.role;
        if (!role) return;

        if (exceptionRoles.includes(role.id)) {
          return interaction.reply({
            content: t('commands.commandrestrict.role.already_exception', locale, { role: role.name }),
            ephemeral: true
          });
        }

        exceptionRoles.push(role.id);
        db.updateCommandRestrictions(guildId, {
          exception_roles: JSON.stringify(exceptionRoles)
        });

        return interaction.reply({
          content: t('commands.commandrestrict.role.added', locale, { role: role.name }),
          ephemeral: true
        });
      }

      if (subcommand === 'remove') {
        const role = interaction.options.get('role')?.role;
        if (!role) return;

        const index = exceptionRoles.indexOf(role.id);
        if (index === -1) {
          return interaction.reply({
            content: t('commands.commandrestrict.role.not_exception', locale, { role: role.name }),
            ephemeral: true
          });
        }

        exceptionRoles.splice(index, 1);
        db.updateCommandRestrictions(guildId, {
          exception_roles: JSON.stringify(exceptionRoles)
        });

        return interaction.reply({
          content: t('commands.commandrestrict.role.removed', locale, { role: role.name }),
          ephemeral: true
        });
      }

      if (subcommand === 'list') {
        if (exceptionRoles.length === 0) {
          return interaction.reply({
            content: t('commands.commandrestrict.role.no_roles', locale),
            ephemeral: true
          });
        }

        const roleList = exceptionRoles
          .map(id => `<@&${id}>`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.commandrestrict.role.list_title', locale))
          .setDescription(roleList);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    if (subcommandGroup === 'permission') {
      const exceptionPermissions = restrictions.exception_permissions
        ? JSON.parse(restrictions.exception_permissions) as string[]
        : [];

      if (subcommand === 'add') {
        const permission = interaction.options.get('permission')?.value as string;
        if (!permission) return;

        if (exceptionPermissions.includes(permission)) {
          return interaction.reply({
            content: t('commands.commandrestrict.permission.already_exception', locale, { permission }),
            ephemeral: true
          });
        }

        exceptionPermissions.push(permission);
        db.updateCommandRestrictions(guildId, {
          exception_permissions: JSON.stringify(exceptionPermissions)
        });

        return interaction.reply({
          content: t('commands.commandrestrict.permission.added', locale, { permission }),
          ephemeral: true
        });
      }

      if (subcommand === 'remove') {
        const permission = interaction.options.get('permission')?.value as string;
        if (!permission) return;

        const index = exceptionPermissions.indexOf(permission);
        if (index === -1) {
          return interaction.reply({
            content: t('commands.commandrestrict.permission.not_exception', locale, { permission }),
            ephemeral: true
          });
        }

        exceptionPermissions.splice(index, 1);
        db.updateCommandRestrictions(guildId, {
          exception_permissions: JSON.stringify(exceptionPermissions)
        });

        return interaction.reply({
          content: t('commands.commandrestrict.permission.removed', locale, { permission }),
          ephemeral: true
        });
      }

      if (subcommand === 'list') {
        if (exceptionPermissions.length === 0) {
          return interaction.reply({
            content: t('commands.commandrestrict.permission.no_permissions', locale),
            ephemeral: true
          });
        }

        const permissionList = exceptionPermissions
          .map(p => `• ${p}`)
          .join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.commandrestrict.permission.list_title', locale))
          .setDescription(permissionList);

        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }

    if (subcommand === 'status') {
      const blacklistedChannels = restrictions.blacklisted_channels
        ? JSON.parse(restrictions.blacklisted_channels) as string[]
        : [];
      const exceptionRoles = restrictions.exception_roles
        ? JSON.parse(restrictions.exception_roles) as string[]
        : [];
      const exceptionPermissions = restrictions.exception_permissions
        ? JSON.parse(restrictions.exception_permissions) as string[]
        : [];

      const embed = new EmbedBuilder()
        .setColor(restrictions.enabled ? 0x57F287 : 0xED4245)
        .setTitle(t('commands.commandrestrict.status.title', locale))
        .addFields(
          {
            name: t('commands.commandrestrict.status.system', locale),
            value: restrictions.enabled
              ? t('commands.commandrestrict.status.enabled', locale)
              : t('commands.commandrestrict.status.disabled', locale),
            inline: true
          },
          {
            name: t('commands.commandrestrict.status.blacklisted_channels', locale),
            value: blacklistedChannels.length > 0
              ? blacklistedChannels.map(id => `<#${id}>`).join('\n')
              : t('commands.commandrestrict.status.none', locale),
            inline: false
          },
          {
            name: t('commands.commandrestrict.status.exception_roles', locale),
            value: exceptionRoles.length > 0
              ? exceptionRoles.map(id => `<@&${id}>`).join('\n')
              : t('commands.commandrestrict.status.none', locale),
            inline: false
          },
          {
            name: t('commands.commandrestrict.status.exception_permissions', locale),
            value: exceptionPermissions.length > 0
              ? exceptionPermissions.map(p => `• ${p}`).join('\n')
              : t('commands.commandrestrict.status.none', locale),
            inline: false
          }
        );

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
