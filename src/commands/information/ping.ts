import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with bot latency information'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    await interaction.deferReply();

    const apiLatency = Math.round(interaction.client.ws.ping);
    const startTime = Date.now();

    await interaction.editReply(t('commands.ping.calculating', locale));

    const latency = Date.now() - startTime;

    await interaction.editReply(
      t('commands.ping.pong', locale, {
        latency: latency.toString(),
        api: apiLatency.toString()
      })
    );
  }
};

export default command;
