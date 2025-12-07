import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Roll a dice')
    .addIntegerOption(option =>
      option
        .setName('sides')
        .setDescription('Number of sides on the dice (default: 6)')
        .setRequired(false)
        .setMinValue(2)
        .setMaxValue(100)
    )
    .addIntegerOption(option =>
      option
        .setName('count')
        .setDescription('Number of dice to roll (default: 1)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const sides = interaction.options.getInteger('sides') || 6;
    const count = interaction.options.getInteger('count') || 1;

    const rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      rolls.push(Math.floor(Math.random() * sides) + 1);
    }

    const total = rolls.reduce((sum, roll) => sum + roll, 0);

    let response = t('commands.roll.rolling', locale, { count: count.toString(), sides: sides.toString() }) + '\n\n';
    response += t('commands.roll.results', locale, { results: rolls.join(', ') }) + '\n';
    if (count > 1) {
      response += t('commands.roll.total', locale, { total: total.toString() });
    }

    await interaction.reply(response);
  }
};

export default command;
