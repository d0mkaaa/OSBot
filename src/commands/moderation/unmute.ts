import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, GuildMember, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { sendModLog } from '../../utils/mod-log.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Removes timeout from a member')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The member to remove timeout from')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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

    let member: GuildMember | undefined;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch (error) {
      await interaction.reply({
        content: t('commands.unmute.not_in_server', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (!member.isCommunicationDisabled()) {
      await interaction.reply({
        content: t('commands.unmute.not_muted', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await member.timeout(null);

      await interaction.reply(
        t('commands.unmute.success', locale, { user: targetUser.tag })
      );

      await sendModLog(interaction.guild, 'Unmute', interaction.user, targetUser, 'Timeout removed');

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MEMBER_UNTIMEOUT',
        moderator: interaction.user,
        target: targetUser,
        reason: 'Timeout removed'
      });
    } catch (error) {
      await interaction.reply({
        content: t('commands.unmute.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
