import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { BackupManager } from '../../utils/backup-manager.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { env } from '../../config/environment.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Manage database backups')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a manual backup of the database')
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all available backups')
    )
    .addSubcommand(sub =>
      sub
        .setName('restore')
        .setDescription('Restore database from a backup')
        .addStringOption(opt =>
          opt
            .setName('backup')
            .setDescription('The backup file name to restore')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View backup system status')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const subcommand = interaction.options.getSubcommand();

    const botOwners = env.botOwners.split(',').map(id => id.trim());
    if (!botOwners.includes(interaction.user.id)) {
      await interaction.reply({
        content: t('commands.backup.owner_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const backupManager = BackupManager.getInstance();

    switch (subcommand) {
      case 'create':
        await handleCreate(interaction, backupManager, locale);
        break;
      case 'list':
        await handleList(interaction, backupManager, locale);
        break;
      case 'restore':
        await handleRestore(interaction, backupManager, locale);
        break;
      case 'status':
        await handleStatus(interaction, backupManager, locale);
        break;
    }
  }
};

async function handleCreate(interaction: ChatInputCommandInteraction, backupManager: BackupManager, locale: string): Promise<void> {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await backupManager.createBackup(true);

  if (result.success) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(t('commands.backup.create.success_title', locale))
      .setDescription(t('commands.backup.create.success_description', locale, {
        path: result.path || 'unknown'
      }))
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.editReply({
      content: t('commands.backup.create.error', locale, { error: result.error || 'Unknown error' })
    });
  }
}

async function handleList(interaction: ChatInputCommandInteraction, backupManager: BackupManager, locale: string): Promise<void> {
  const backups = backupManager.listBackups();

  if (backups.length === 0) {
    await interaction.reply({
      content: t('commands.backup.list.no_backups', locale),
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(t('commands.backup.list.title', locale))
    .setDescription(t('commands.backup.list.total', locale, { count: backups.length.toString() }));

  const fields = backups.slice(0, 10).map(backup => ({
    name: backup.name,
    value: t('commands.backup.list.backup_info', locale, {
      size: backup.size,
      date: backup.date.toLocaleString()
    }),
    inline: false
  }));

  embed.addFields(fields);

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

async function handleRestore(interaction: ChatInputCommandInteraction, backupManager: BackupManager, locale: string): Promise<void> {
  const backupName = interaction.options.getString('backup', true);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const result = await backupManager.restoreBackup(backupName);

  if (result.success) {
    const embed = new EmbedBuilder()
      .setColor(0x00ff00)
      .setTitle(t('commands.backup.restore.success_title', locale))
      .setDescription(t('commands.backup.restore.success_description', locale, {
        backup: backupName
      }))
      .addFields({
        name: t('commands.backup.restore.warning_title', locale),
        value: t('commands.backup.restore.warning_message', locale)
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } else {
    await interaction.editReply({
      content: t('commands.backup.restore.error', locale, { error: result.error || 'Unknown error' })
    });
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction, backupManager: BackupManager, locale: string): Promise<void> {
  const status = backupManager.getStatus();

  const embed = new EmbedBuilder()
    .setColor(status.enabled ? 0x00ff00 : 0xff0000)
    .setTitle(t('commands.backup.status.title', locale))
    .addFields(
      {
        name: t('commands.backup.status.auto_backup', locale),
        value: status.enabled ? t('common.enabled', locale) : t('common.disabled', locale),
        inline: true
      },
      {
        name: t('commands.backup.status.total_backups', locale),
        value: status.totalBackups.toString(),
        inline: true
      },
      {
        name: t('commands.backup.status.max_retention', locale),
        value: status.maxBackups.toString(),
        inline: true
      },
      {
        name: t('commands.backup.status.backup_dir', locale),
        value: `\`${status.backupDir}\``,
        inline: false
      }
    )
    .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral
  });
}

export default command;
