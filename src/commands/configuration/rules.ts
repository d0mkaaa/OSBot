import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rules')
    .setDescription('Manage server rules')
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Add a new rule')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Rule number')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('Rule title')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('Rule description')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('edit')
        .setDescription('Edit an existing rule')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Rule number to edit')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option =>
          option
            .setName('title')
            .setDescription('New rule title')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('description')
            .setDescription('New rule description')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('remove')
        .setDescription('Remove a rule')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Rule number to remove')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all server rules')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a specific rule')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Rule number to view')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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

    db.createGuild(interaction.guild.id);

    if (subcommand === 'add') {
      const ruleNumber = interaction.options.getInteger('number', true);
      const title = interaction.options.getString('title', true);
      const description = interaction.options.getString('description', true);

      const existingRule = db.getRule(interaction.guild.id, ruleNumber);
      if (existingRule) {
        await interaction.reply({
          content: t('commands.rules.already_exists', locale, { number: ruleNumber.toString() }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        db.createRule(interaction.guild.id, ruleNumber, title, description);

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle(t('commands.rules.added_title', locale))
          .setDescription(t('commands.rules.added_description', locale, { number: ruleNumber.toString() }))
          .addFields(
            { name: t('commands.rules.title_label', locale), value: title, inline: false },
            { name: t('commands.rules.description_label', locale), value: description, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({
          content: t('commands.rules.add_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    if (subcommand === 'edit') {
      const ruleNumber = interaction.options.getInteger('number', true);
      const title = interaction.options.getString('title', true);
      const description = interaction.options.getString('description', true);

      const existingRule = db.getRule(interaction.guild.id, ruleNumber);
      if (!existingRule) {
        await interaction.reply({
          content: t('commands.rules.not_found', locale, { number: ruleNumber.toString() }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        db.updateRule(interaction.guild.id, ruleNumber, title, description);

        const embed = new EmbedBuilder()
          .setColor(0xFFAA00)
          .setTitle(t('commands.rules.updated_title', locale))
          .setDescription(t('commands.rules.updated_description', locale, { number: ruleNumber.toString() }))
          .addFields(
            { name: t('commands.rules.new_title_label', locale), value: title, inline: false },
            { name: t('commands.rules.new_description_label', locale), value: description, inline: false }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        await interaction.reply({
          content: t('commands.rules.update_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    if (subcommand === 'remove') {
      const ruleNumber = interaction.options.getInteger('number', true);

      const existingRule = db.getRule(interaction.guild.id, ruleNumber);
      if (!existingRule) {
        await interaction.reply({
          content: t('commands.rules.not_found', locale, { number: ruleNumber.toString() }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        db.deleteRule(interaction.guild.id, ruleNumber);

        await interaction.reply({
          content: t('commands.rules.removed', locale, { number: ruleNumber.toString() }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        await interaction.reply({
          content: t('commands.rules.remove_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    if (subcommand === 'view') {
      const ruleNumber = interaction.options.getInteger('number', true);
      const rule = db.getRule(interaction.guild.id, ruleNumber) as any;

      if (!rule) {
        await interaction.reply({
          content: t('commands.rules.not_found', locale, { number: ruleNumber.toString() }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Rule #${rule.rule_number}`)
        .addFields(
          { name: t('commands.rules.title_label', locale), value: rule.title, inline: false },
          { name: t('commands.rules.description_label', locale), value: rule.description, inline: false }
        )
        .setFooter({ text: `${t('commands.rules.created', locale)}: ${new Date(rule.created_at * 1000).toLocaleDateString()}` })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'list') {
      const rules = db.getRules(interaction.guild.id) as any[];

      if (rules.length === 0) {
        await interaction.reply({
          content: t('commands.rules.no_rules', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${interaction.guild.name} ${t('commands.rules.list_title', locale)}`)
        .setDescription(`${t('commands.rules.total', locale)}: ${rules.length}`)
        .setTimestamp();

      for (const rule of rules) {
        embed.addFields({
          name: `Rule #${rule.rule_number}: ${rule.title}`,
          value: rule.description,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed] });
    }
  }
};

export default command;