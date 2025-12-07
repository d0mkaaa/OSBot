import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('levelroles')
    .setDescription('Manage level role rewards')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a role reward for reaching a level')
        .addIntegerOption(opt => opt.setName('level').setDescription('Level to reach').setRequired(true).setMinValue(1))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to award').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a level role reward')
        .addIntegerOption(opt => opt.setName('level').setDescription('Level').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all level role rewards')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const db = DatabaseManager.getInstance();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const level = interaction.options.getInteger('level', true);
      const role = interaction.options.getRole('role', true);
      const existing = db.getLevelRole(interaction.guildId, level) as any;

      if (existing) {
        await interaction.reply({
          content: t('commands.levelroles.already_exists', locale, { level: level.toString() }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const botMember = await interaction.guild.members.fetchMe();
      if (role.position >= botMember.roles.highest.position) {
        await interaction.reply({
          content: t('commands.levelroles.role_too_high', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        db.addLevelRole(interaction.guildId, level, role.id);

        await interaction.reply({
          content: t('commands.levelroles.added', locale, { level: level.toString(), role: `${role}` }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to add level role:', error);
        await interaction.reply({
          content: t('commands.levelroles.add_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'remove') {
      const level = interaction.options.getInteger('level', true);

      try {
        db.deleteLevelRole(interaction.guildId, level);

        await interaction.reply({
          content: t('commands.levelroles.removed', locale, { level: level.toString() }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to remove level role:', error);
        await interaction.reply({
          content: t('commands.levelroles.remove_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'list') {
      const levelRoles = db.getLevelRoles(interaction.guildId) as any[];

      if (levelRoles.length === 0) {
        await interaction.reply({
          content: t('commands.levelroles.no_rewards', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.levelroles.list_title', locale))
        .setDescription(t('commands.levelroles.list_description', locale))
        .addFields(
          levelRoles.map(lr => ({
            name: t('commands.levelroles.level_label', locale, { level: lr.level.toString() }),
            value: `<@&${lr.role_id}>`,
            inline: true
          }))
        )
        .setFooter({ text: t('commands.levelroles.footer', locale, { count: levelRoles.length.toString(), plural: levelRoles.length === 1 ? '' : 's' }) });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

export default command;
