import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';
import { getInteractionLocale } from '../utils/locale-helper.js';
import { t } from '../utils/i18n.js';

export default {
  data: new SlashCommandBuilder()
    .setName('appeal')
    .setDescription('Submit an appeal for a moderation action')
    .addStringOption(option =>
      option
        .setName('type')
        .setDescription('Type of moderation action')
        .setRequired(true)
        .addChoices(
          { name: 'Ban', value: 'ban' },
          { name: 'Warning', value: 'warn' },
          { name: 'Mute', value: 'mute' },
          { name: 'Kick', value: 'kick' }
        )
    )
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for your appeal')
        .setRequired(true)
        .setMaxLength(1000)
    )
    .addStringOption(option =>
      option
        .setName('case_id')
        .setDescription('Case ID or warning ID (if applicable)')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', getInteractionLocale(interaction)),
        ephemeral: true
      });
      return;
    }

    const type = interaction.options.getString('type', true);
    const reason = interaction.options.getString('reason', true);
    const caseId = interaction.options.getString('case_id');
    const locale = getInteractionLocale(interaction);

    const db = DatabaseManager.getInstance();

    try {
      db.createAppeal(
        interaction.guild.id,
        interaction.user.id,
        type,
        caseId,
        reason
      );

      await interaction.reply({
        content: t('commands.appeal.success', locale, {
          type,
          reason: reason.substring(0, 100)
        }),
        ephemeral: true
      });
    } catch (error) {
      console.error('Failed to create appeal:', error);
      await interaction.reply({
        content: t('commands.appeal.error', locale),
        ephemeral: true
      });
    }
  }
};
