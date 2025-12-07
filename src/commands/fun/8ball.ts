import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { ta } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Ask the magic 8-ball a question')
    .addStringOption(option =>
      option
        .setName('question')
        .setDescription('Your question')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const question = interaction.options.getString('question', true);

    const responses = ta('commands.8ball.responses', locale);
    const response = responses[Math.floor(Math.random() * responses.length)];

    await interaction.reply(`🎱 **${question}**\n\n*${response}*`);
  }
};

export default command;
