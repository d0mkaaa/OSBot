import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { sendModLog } from '../../utils/mod-log.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a member from the server')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to ban')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('The reason for banning')
        .setRequired(false)
    )
    .addIntegerOption(option =>
      option
        .setName('delete-messages')
        .setDescription('Delete messages from the last X days (0-7)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(7)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

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
    const guildData = db.getGuild(interaction.guild.id) as any;

    if (!guildData?.moderation_enabled) {
      await interaction.reply({
        content: t('common.errors.module_disabled', locale, { module: 'moderation' }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetUser = interaction.options.getUser('target', true);
    const reason = interaction.options.getString('reason') || t('commands.ban.no_reason', locale);
    const deleteMessageDays = interaction.options.getInteger('delete-messages') || 0;

    let member: GuildMember | undefined;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      member = undefined;
    }

    if (member) {
      if (member.id === interaction.user.id) {
        await interaction.reply({
          content: t('commands.ban.cannot_ban_self', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (member.id === interaction.guild.ownerId) {
        await interaction.reply({
          content: t('commands.ban.cannot_ban_owner', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const executor = interaction.member as GuildMember;
      if (member.roles.highest.position >= executor.roles.highest.position) {
        await interaction.reply({
          content: t('commands.ban.higher_role', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (!member.bannable) {
        await interaction.reply({
          content: t('commands.ban.bot_higher_role', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }
    }

    try {
      try {
        await targetUser.send(
          t('commands.ban.dm_message', locale, {
            server: interaction.guild.name,
            reason: reason
          })
        );
      } catch {

      }

      await interaction.guild.members.ban(targetUser.id, {
        reason,
        deleteMessageSeconds: deleteMessageDays * 24 * 60 * 60
      });

      const db = DatabaseManager.getInstance();
      const caseNumber = db.createCase(
        interaction.guild.id,
        'Ban',
        targetUser.id,
        interaction.user.id,
        reason
      );

      await interaction.reply({
        content: t('commands.ban.success', locale, {
          user: targetUser.tag,
          reason: reason ? ` | ${t('commands.ban.reason_label', locale)}: ${reason}` : '',
          case: caseNumber.toString()
        })
      });

      await sendModLog(
        interaction.guild,
        'Ban',
        interaction.user,
        targetUser,
        reason,
        deleteMessageDays > 0 ? [
          { name: t('commands.ban.messages_deleted', locale), value: `${deleteMessageDays} ${deleteMessageDays > 1 ? t('common.days', locale) : t('common.day', locale)}`, inline: true },
          { name: t('common.case', locale), value: `#${caseNumber}`, inline: true }
        ] : [{ name: t('common.case', locale), value: `#${caseNumber}`, inline: true }]
      );
    } catch (error) {
      await interaction.reply({
        content: t('commands.ban.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;