import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { sendModLog } from '../../utils/mod-log.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to kick')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for kicking')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') || t('commands.kick.no_reason', locale);

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

    if (member.id === interaction.user.id) {
      await interaction.reply({
        content: t('commands.kick.cannot_kick_self', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (member.id === interaction.guild.ownerId) {
      await interaction.reply({
        content: t('commands.kick.cannot_kick_owner', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const executor = interaction.member as GuildMember;
    if (member.roles.highest.position >= executor.roles.highest.position) {
      await interaction.reply({
        content: t('commands.kick.higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!member.kickable) {
      await interaction.reply({
        content: t('commands.kick.bot_higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      try {
        await targetUser.send(
          t('commands.kick.dm_message', locale, {
            server: interaction.guild.name,
            reason: reason
          })
        );
      } catch {

      }

      await member.kick(reason);

      const db = DatabaseManager.getInstance();
      const caseNumber = db.createCase(
        interaction.guild.id,
        'Kick',
        targetUser.id,
        interaction.user.id,
        reason
      );

      await interaction.reply({
        content: t('commands.kick.success', locale, {
          user: targetUser.tag,
          reason: reason ? ` | ${t('commands.kick.reason_label', locale)}: ${reason}` : '',
          case: caseNumber.toString()
        })
      });

      await sendModLog(interaction.guild, 'Kick', interaction.user, targetUser, reason, [
        { name: t('common.case', locale), value: `#${caseNumber}`, inline: true }
      ]);

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MEMBER_KICK',
        moderator: interaction.user,
        target: targetUser,
        reason
      });
    } catch (error) {
      await interaction.reply({
        content: t('commands.kick.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
