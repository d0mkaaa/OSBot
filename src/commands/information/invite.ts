import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('invite')
    .setDescription('Get the bot invite link'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const clientId = interaction.client.user?.id;
    const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.invite.title', locale))
      .setDescription(t('commands.invite.description', locale, { link: inviteLink }))
      .addFields({
        name: t('commands.invite.link_label', locale),
        value: `[${t('commands.invite.click_here', locale)}](${inviteLink})`
      })
      .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
