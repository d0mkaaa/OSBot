import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Displays a user\'s avatar')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user whose avatar to display')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const targetUser = interaction.options.getUser('target') || interaction.user;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.avatar.title', locale, { user: targetUser.tag }))
      .setImage(targetUser.displayAvatarURL({ size: 4096 }))
      .setDescription(
        `[PNG](${targetUser.displayAvatarURL({ extension: 'png', size: 4096 })}) | ` +
        `[JPG](${targetUser.displayAvatarURL({ extension: 'jpg', size: 4096 })}) | ` +
        `[WEBP](${targetUser.displayAvatarURL({ extension: 'webp', size: 4096 })})`
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
