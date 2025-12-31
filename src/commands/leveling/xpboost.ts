import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('xpboost')
    .setDescription('Manage XP multiplier boosters')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add an XP booster')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Booster type')
            .setRequired(true)
            .addChoices(
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' }
            )
        )
        .addNumberOption(opt => opt.setName('multiplier').setDescription('XP multiplier (e.g., 1.5 for 50% boost, 2 for 100% boost)').setRequired(true).setMinValue(1.0).setMaxValue(5.0))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to boost (if type=role)'))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to boost (if type=channel)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove an XP booster')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Booster type')
            .setRequired(true)
            .addChoices(
              { name: 'Role', value: 'role' },
              { name: 'Channel', value: 'channel' }
            )
        )
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove boost from (if type=role)'))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to remove boost from (if type=channel)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all XP boosters')
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
    const guildData = db.getGuild(interaction.guildId) as any;

    if (!guildData?.leveling_enabled) {
      await interaction.reply({
        content: t('common.errors.module_disabled', locale, { module: 'leveling' }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const type = interaction.options.getString('type', true) as 'role' | 'channel';
      const multiplier = interaction.options.getNumber('multiplier', true);
      const role = interaction.options.getRole('role');
      const channel = interaction.options.getChannel('channel');

      if (type === 'role' && !role) {
        await interaction.reply({
          content: t('commands.xpboost.role_required', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (type === 'channel' && !channel) {
        await interaction.reply({
          content: t('commands.xpboost.channel_required', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const targetId = type === 'role' ? role!.id : channel!.id;
      const existing = db.getXPBooster(interaction.guildId, type, targetId);

      if (existing) {
        await interaction.reply({
          content: t('commands.xpboost.already_exists', locale, { type }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        db.addXPBooster(interaction.guildId, type, targetId, multiplier, interaction.user.id);

        const targetMention = type === 'role' ? `<@&${targetId}>` : `<#${targetId}>`;
        await interaction.reply({
          content: t('commands.xpboost.added', locale, {
            type,
            target: targetMention,
            multiplier: multiplier.toString()
          }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to add XP booster:', error);
        await interaction.reply({
          content: t('commands.xpboost.add_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'remove') {
      const type = interaction.options.getString('type', true) as 'role' | 'channel';
      const role = interaction.options.getRole('role');
      const channel = interaction.options.getChannel('channel');

      if (type === 'role' && !role) {
        await interaction.reply({
          content: t('commands.xpboost.role_required', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (type === 'channel' && !channel) {
        await interaction.reply({
          content: t('commands.xpboost.channel_required', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const targetId = type === 'role' ? role!.id : channel!.id;

      try {
        db.deleteXPBooster(interaction.guildId, type, targetId);

        const targetMention = type === 'role' ? `<@&${targetId}>` : `<#${targetId}>`;
        await interaction.reply({
          content: t('commands.xpboost.removed', locale, { type, target: targetMention }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to remove XP booster:', error);
        await interaction.reply({
          content: t('commands.xpboost.remove_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'list') {
      const boosters = db.getXPBoosters(interaction.guildId) as any[];

      if (boosters.length === 0) {
        await interaction.reply({
          content: t('commands.xpboost.no_boosters', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const roleBoosters = boosters.filter(b => b.type === 'role');
      const channelBoosters = boosters.filter(b => b.type === 'channel');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.xpboost.list_title', locale))
        .setDescription(t('commands.xpboost.list_description', locale));

      if (roleBoosters.length > 0) {
        embed.addFields({
          name: t('commands.xpboost.role_boosters', locale),
          value: roleBoosters.map(b => `<@&${b.target_id}> - **${b.multiplier}x**`).join('\n'),
          inline: false
        });
      }

      if (channelBoosters.length > 0) {
        embed.addFields({
          name: t('commands.xpboost.channel_boosters', locale),
          value: channelBoosters.map(b => `<#${b.target_id}> - **${b.multiplier}x**`).join('\n'),
          inline: false
        });
      }

      embed.setFooter({ text: t('commands.xpboost.footer', locale, { count: boosters.length.toString() }) });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

export default command;
