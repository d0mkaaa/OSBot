import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Choose randomly from options (separate with |)')
    .addStringOption(option =>
      option
        .setName('options')
        .setDescription('Options separated by | (e.g., pizza|burger|sushi)')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const input = interaction.options.getString('options', true);
    const options = input.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
      await interaction.reply({
        content: t('commands.choose.tooFew', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const choice = options[Math.floor(Math.random() * options.length)];
    await interaction.reply(t('commands.choose.result', locale, { choice }));
  }
};

export default command;
