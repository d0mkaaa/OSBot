import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Displays information about the bot'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const client = interaction.client;
    const uptime = client.uptime || 0;

    const days = Math.floor(uptime / 86400000);
    const hours = Math.floor(uptime / 3600000) % 24;
    const minutes = Math.floor(uptime / 60000) % 60;
    const seconds = Math.floor(uptime / 1000) % 60;

    const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.botinfo.title', locale))
      .setThumbnail(client.user?.displayAvatarURL() || null)
      .addFields(
        { name: t('commands.botinfo.bot_name', locale), value: client.user?.tag || t('commands.botinfo.unknown', locale), inline: true },
        { name: t('commands.botinfo.bot_id', locale), value: client.user?.id || t('commands.botinfo.unknown', locale), inline: true },
        { name: t('commands.botinfo.uptime', locale), value: uptimeString, inline: true },
        { name: t('commands.botinfo.servers', locale), value: client.guilds.cache.size.toString(), inline: true },
        { name: t('commands.botinfo.users', locale), value: client.users.cache.size.toString(), inline: true },
        { name: t('commands.botinfo.ping', locale), value: `${Math.round(client.ws.ping)}ms`, inline: true },
        { name: t('commands.botinfo.platform', locale), value: process.platform, inline: true },
        { name: t('commands.botinfo.node_version', locale), value: process.version, inline: true },
        { name: t('commands.botinfo.discordjs', locale), value: 'v14', inline: true }
      )
      .setFooter({ text: t('commands.botinfo.footer', locale) })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
