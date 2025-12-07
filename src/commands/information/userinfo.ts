import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, GuildMember } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Displays information about a user')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user to get information about')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const member = interaction.guild?.members.cache.get(targetUser.id) as GuildMember | undefined;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`${targetUser.tag}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: t('commands.userinfo.username', locale), value: targetUser.username, inline: true },
        { name: t('commands.userinfo.user_id', locale), value: targetUser.id, inline: true },
        { name: t('commands.userinfo.bot', locale), value: targetUser.bot ? t('commands.userinfo.yes', locale) : t('commands.userinfo.no', locale), inline: true },
        { name: t('commands.userinfo.account_created', locale), value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true }
      )
      .setTimestamp();

    if (member) {
      embed.addFields(
        { name: t('commands.userinfo.joined_server', locale), value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:R>`, inline: true },
        { name: t('commands.userinfo.nickname', locale), value: member.nickname || t('commands.userinfo.none', locale), inline: true }
      );

      const roles = member.roles.cache
        .filter(role => role.id !== interaction.guild?.id)
        .sort((a, b) => b.position - a.position)
        .map(role => role.toString())
        .slice(0, 10);

      if (roles.length > 0) {
        embed.addFields({
          name: t('commands.userinfo.roles', locale, { count: (member.roles.cache.size - 1).toString() }),
          value: roles.join(', ') + (member.roles.cache.size > 11 ? '...' : ''),
          inline: false
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
