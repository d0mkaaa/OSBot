import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('View or manage moderation cases')
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View a specific case')
        .addIntegerOption(option =>
          option
            .setName('number')
            .setDescription('Case number to view')
            .setRequired(true)
            .setMinValue(1)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription('View all cases for a user')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('User to view cases for')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List recent cases')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of cases to show (default: 10)')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
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

    const db = DatabaseManager.getInstance();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'view') {
      const caseNumber = interaction.options.getInteger('number', true);
      const caseData = db.getCase(interaction.guild.id, caseNumber) as any;

      if (!caseData) {
        await interaction.reply({
          content: t('commands.case.not_found', locale, { case: caseNumber.toString() }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const user = await interaction.client.users.fetch(caseData.user_id).catch(() => null);
      const moderator = await interaction.client.users.fetch(caseData.moderator_id).catch(() => null);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Case #${caseData.case_number}`)
        .addFields(
          { name: '⚖️ Action', value: caseData.action_type, inline: true },
          { name: '👤 User', value: user ? `${user.tag} (${user.id})` : caseData.user_id, inline: true },
          { name: '👮 Moderator', value: moderator ? `${moderator.tag}` : caseData.moderator_id, inline: true },
          { name: '📝 Reason', value: caseData.reason || t('commands.case.no_reason', locale), inline: false }
        )
        .setTimestamp(caseData.created_at * 1000);

      if (caseData.duration) {
        const hours = Math.floor(caseData.duration / 3600);
        const minutes = Math.floor((caseData.duration % 3600) / 60);
        let durationStr = '';
        if (hours > 0) durationStr += `${hours}h `;
        if (minutes > 0) durationStr += `${minutes}m`;
        embed.addFields({ name: '⏱️ Duration', value: durationStr.trim(), inline: true });
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'user') {
      const user = interaction.options.getUser('target', true);
      const cases = db.getCasesByUser(interaction.guild.id, user.id) as any[];

      if (cases.length === 0) {
        await interaction.reply({
          content: t('commands.case.user_no_cases', locale, { user: user.tag }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📋 Cases for ${user.tag}`)
        .setDescription(
          cases.slice(0, 10).map(c => {
            const timestamp = `<t:${c.created_at}:R>`;
            return `**Case #${c.case_number}** - ${c.action_type} ${timestamp}\n└ Reason: ${c.reason || t('commands.case.no_reason', locale)}`;
          }).join('\n\n')
        )
        .setFooter({ text: `Total cases: ${cases.length}` });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (subcommand === 'list') {
      const limit = interaction.options.getInteger('limit') || 10;
      const cases = db.getAllCases(interaction.guild.id, limit) as any[];

      if (cases.length === 0) {
        await interaction.reply({
          content: t('commands.case.no_cases', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Recent Cases')
        .setDescription(
          cases.map(c => {
            const timestamp = `<t:${c.created_at}:R>`;
            return `**Case #${c.case_number}** - ${c.action_type} <@${c.user_id}> ${timestamp}`;
          }).join('\n')
        )
        .setFooter({ text: `Showing ${cases.length} most recent cases` });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }
  }
};

export default command;
