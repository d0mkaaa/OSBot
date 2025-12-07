import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Creates a custom embed message')
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('The embed title')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('description')
        .setDescription('The embed description')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('color')
        .setDescription('Hex color code (e.g., #5865F2)')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('footer')
        .setDescription('Footer text')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);
    const colorHex = interaction.options.getString('color');
    const footer = interaction.options.getString('footer');

    let color = 0x5865F2;
    if (colorHex) {
      const hexMatch = colorHex.match(/^#?([0-9A-Fa-f]{6})$/);
      if (hexMatch) {
        color = parseInt(hexMatch[1], 16);
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    if (footer) {
      embed.setFooter({ text: footer });
    }

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
