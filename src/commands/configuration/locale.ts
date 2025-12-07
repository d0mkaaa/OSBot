import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getSupportedLocales, setGuildLocale, getGuildLocale, isValidLocale } from '../../utils/locale-manager.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('locale')
    .setDescription('Manage server language settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('set')
        .setDescription('Set the server language')
        .addStringOption(option =>
          option
            .setName('language')
            .setDescription('Language to use')
            .setRequired(true)
            .addChoices(
              { name: '🇺🇸 English', value: 'en' },
              { name: '🇪🇸 Español (Spanish)', value: 'es' },
              { name: '🇫🇷 Français (French)', value: 'fr' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View current language settings')
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all available languages')
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guildId) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      const newLocale = interaction.options.getString('language', true);

      if (!isValidLocale(newLocale)) {
        await interaction.reply({
          content: t('commands.locale.invalid_locale', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const success = setGuildLocale(interaction.guildId, newLocale);

      if (success) {
        const localeInfo = getSupportedLocales().find(l => l.code === newLocale);
        await interaction.reply({
          content: t('commands.locale.set_success', newLocale, {
            language: localeInfo?.nativeName || newLocale,
            emoji: localeInfo?.emoji || ''
          }),
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: t('commands.locale.set_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }

    } else if (subcommand === 'view') {
      const currentLocale = getGuildLocale(interaction.guildId);
      const localeInfo = getSupportedLocales().find(l => l.code === currentLocale);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.locale.view_title', locale))
        .addFields(
          {
            name: t('commands.locale.current_language', locale),
            value: localeInfo
              ? `${localeInfo.emoji} ${localeInfo.nativeName} (${localeInfo.name})`
              : currentLocale,
            inline: true
          },
          {
            name: t('commands.locale.language_code', locale),
            value: `\`${currentLocale}\``,
            inline: true
          }
        )
        .setFooter({ text: t('commands.locale.view_footer', locale) })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

    } else if (subcommand === 'list') {
      const locales = getSupportedLocales();
      const currentLocale = getGuildLocale(interaction.guildId);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.locale.list_title', locale))
        .setDescription(t('commands.locale.list_description', locale))
        .addFields(
          locales.map(l => ({
            name: `${l.emoji} ${l.nativeName}`,
            value: `**${l.name}** • Code: \`${l.code}\`${l.code === currentLocale ? ' ✅' : ''}`,
            inline: true
          }))
        )
        .setFooter({ text: t('commands.locale.list_footer', locale) })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

export default command;
