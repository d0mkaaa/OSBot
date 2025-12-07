import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { security } from '../../utils/security.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Make the bot say something')
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('The message to send')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const rawMessage = interaction.options.getString('message', true);

    const message = security.sanitizeInput(rawMessage, 2000);

    if (message.length === 0) {
      await interaction.reply({
        content: t('commands.say.empty_message', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const cleanMessage = message.replace(/@(everyone|here)/g, '@\u200B$1');

    if (interaction.channel && 'send' in interaction.channel) {
      await interaction.channel.send(cleanMessage);
    }

    await interaction.reply({
      content: t('commands.say.success', locale),
      flags: MessageFlags.Ephemeral
    });
  }
};

export default command;
