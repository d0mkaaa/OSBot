import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Manage custom text tags')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a custom tag')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Command name (without prefix)')
            .setRequired(true)
            .setMaxLength(32)
        )
        .addStringOption(option =>
          option
            .setName('response')
            .setDescription('What the bot should respond with')
            .setRequired(true)
            .setMaxLength(2000)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delete')
        .setDescription('Delete a custom tag')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Tag name to delete')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all custom tags')
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Get info about a custom tag')
        .addStringOption(option =>
          option
            .setName('name')
            .setDescription('Command name')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    if (!interaction.guildId) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const db = DatabaseManager.getInstance();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const name = interaction.options.getString('name', true).toLowerCase();
      const response = interaction.options.getString('response', true);

      const existing = db.getCustomCommand(interaction.guildId, name);
      if (existing) {
        await interaction.reply({
          content: t('commands.tag.exists', locale, { name }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.createCustomCommand(interaction.guildId, name, response, interaction.user.id);

      await auditLogger.log({
        guild: interaction.guild!,
        action: 'CUSTOM_COMMAND_CREATE',
        moderator: interaction.user,
        details: { command_name: name }
      });

      await interaction.reply({
        content: t('commands.tag.created', locale, { name }),
        flags: MessageFlags.Ephemeral
      });

    } else if (subcommand === 'delete') {
      const name = interaction.options.getString('name', true).toLowerCase();

      const existing = db.getCustomCommand(interaction.guildId, name);
      if (!existing) {
        await interaction.reply({
          content: t('commands.tag.not_found', locale, { name }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.deleteCustomCommand(interaction.guildId, name);

      await auditLogger.log({
        guild: interaction.guild!,
        action: 'CUSTOM_COMMAND_DELETE',
        moderator: interaction.user,
        details: { command_name: name }
      });

      await interaction.reply({
        content: t('commands.tag.deleted', locale, { name }),
        flags: MessageFlags.Ephemeral
      });

    } else if (subcommand === 'list') {
      const commands = db.getAllCustomCommands(interaction.guildId) as any[];

      if (commands.length === 0) {
        await interaction.reply({
          content: t('commands.tag.no_tags', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.tag.list_title', locale))
        .setDescription(t('commands.tag.list_description', locale, {
          count: commands.length.toString(),
          plural: commands.length === 1 ? '' : 's'
        }))
        .setTimestamp();

      for (const cmd of commands.slice(0, 25)) {
        const cmdData = cmd as any;
        embed.addFields({
          name: `!${cmdData.name}`,
          value: t('commands.tag.uses_label', locale, { count: cmdData.uses.toString() }),
          inline: true
        });
      }

      if (commands.length > 25) {
        embed.setFooter({ text: t('commands.tag.list_footer', locale, {
          shown: '25',
          total: commands.length.toString()
        }) });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (subcommand === 'info') {
      const name = interaction.options.getString('name', true).toLowerCase();
      const cmd = db.getCustomCommand(interaction.guildId, name) as any;

      if (!cmd) {
        await interaction.reply({
          content: t('commands.tag.not_found', locale, { name }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const creator = await interaction.client.users.fetch(cmd.created_by).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.tag.info_title', locale, { name: cmd.name }))
        .addFields(
          { name: t('commands.tag.info_response', locale), value: cmd.response.substring(0, 1024), inline: false },
          { name: t('commands.tag.info_created_by', locale), value: creator ? `${creator.tag}` : t('commands.tag.info_unknown', locale), inline: true },
          { name: t('commands.tag.info_uses', locale), value: cmd.uses.toString(), inline: true },
          { name: t('commands.tag.info_created', locale), value: `<t:${cmd.created_at}:R>`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

export default command;
