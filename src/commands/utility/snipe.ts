import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { snipeManager } from '../../utils/snipe.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the most recently deleted message in this channel'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const snipeData = snipeManager.getSnipe(interaction.channel!.id);

    if (!snipeData) {
      await interaction.reply({
        content: t('commands.snipe.no_messages', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(0xFF6B6B)
      .setAuthor({
        name: snipeData.author.tag,
        iconURL: snipeData.author.avatarURL || undefined
      })
      .setDescription(snipeData.content || t('commands.snipe.no_text', locale))
      .setFooter({ text: t('commands.snipe.deleted_at', locale) })
      .setTimestamp(snipeData.deletedAt);

    if (snipeData.attachments.length > 0) {
      embed.setImage(snipeData.attachments[0]);
      if (snipeData.attachments.length > 1) {
        embed.addFields({
          name: t('commands.snipe.additional_attachments', locale),
          value: snipeData.attachments.slice(1).join('\n')
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
