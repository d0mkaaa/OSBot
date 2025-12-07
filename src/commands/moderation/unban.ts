import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { AuditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(option =>
      option
        .setName('userid')
        .setDescription('User ID to unban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for unbanning')
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

    const userId = interaction.options.getString('userid', true);
    const reason = interaction.options.getString('reason') || t('commands.unban.no_reason', locale);

    if (!/^\d{17,19}$/.test(userId)) {
      await interaction.reply({
        content: t('commands.unban.invalid_id', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      const bans = await interaction.guild.bans.fetch();
      const bannedUser = bans.get(userId);

      if (!bannedUser) {
        await interaction.reply({
          content: t('commands.unban.not_banned', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.guild.bans.remove(userId, reason);

      const auditLogger = new AuditLogger();
      await auditLogger.log({
        guild: interaction.guild,
        action: 'Unban',
        moderator: interaction.user,
        target: userId,
        reason
      });

      await interaction.reply({
        content: t('commands.unban.success', locale, { user: bannedUser.user.tag, id: userId, reason }),
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      await interaction.reply({
        content: t('commands.unban.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;