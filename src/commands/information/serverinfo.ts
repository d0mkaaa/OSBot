import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Displays information about the current server'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const { guild } = interaction;
    const owner = await guild.fetchOwner();

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.serverinfo.title', locale, { server: guild.name }))
      .setThumbnail(guild.iconURL() ?? null)
      .addFields(
        { name: t('commands.serverinfo.server_name', locale), value: guild.name, inline: true },
        { name: t('commands.serverinfo.server_id', locale), value: guild.id, inline: true },
        { name: t('commands.serverinfo.owner', locale), value: `${owner.user.tag}`, inline: true },
        { name: t('commands.serverinfo.created', locale), value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: t('commands.serverinfo.members', locale), value: guild.memberCount.toString(), inline: true },
        { name: t('commands.serverinfo.channels', locale), value: guild.channels.cache.size.toString(), inline: true },
        { name: t('commands.serverinfo.emojis', locale), value: guild.emojis.cache.size.toString(), inline: true },
        { name: t('commands.serverinfo.roles', locale), value: guild.roles.cache.size.toString(), inline: true },
        { name: t('commands.serverinfo.boost_level', locale), value: t('commands.serverinfo.level', locale, { level: guild.premiumTier.toString() }), inline: true }
      )
      .setTimestamp();

    if (guild.description) {
      embed.setDescription(guild.description);
    }

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
