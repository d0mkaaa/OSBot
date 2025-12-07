import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('remind')
    .setDescription('Set a reminder')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('What to remind you about')
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option
        .setName('duration')
        .setDescription('Time in minutes')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10080)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const message = interaction.options.getString('message', true);
    const duration = interaction.options.getInteger('duration', true);

    const db = DatabaseManager.getInstance();
    const remindAt = Math.floor(Date.now() / 1000) + (duration * 60);

    try {
      db.createReminder(
        interaction.user.id,
        interaction.guildId,
        interaction.channelId,
        message,
        remindAt
      );

      const plural = duration === 1 ? '' : 's';
      await interaction.reply(
        t('commands.remind.success', locale, {
          message,
          duration: duration.toString(),
          plural
        })
      );
    } catch (error) {
      logger.error('Failed to create reminder:', error);
      await interaction.reply({
        content: t('commands.remind.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
