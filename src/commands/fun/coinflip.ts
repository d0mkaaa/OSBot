import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const result = Math.random() < 0.5
      ? t('commands.coinflip.heads', locale)
      : t('commands.coinflip.tails', locale);
    await interaction.reply(t('commands.coinflip.result', locale, { result }));
  }
};

export default command;
