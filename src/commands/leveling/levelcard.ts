import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('levelcard')
    .setDescription('Customize your rank card appearance')
    .addSubcommand(sub =>
      sub
        .setName('color')
        .setDescription('Set card background and accent colors')
        .addStringOption(opt => opt.setName('background').setDescription('Background color (hex code, e.g., #5865F2)').setRequired(true))
        .addStringOption(opt => opt.setName('accent').setDescription('Accent color (hex code, e.g., #FFFFFF)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('image')
        .setDescription('Set a custom background image')
        .addStringOption(opt => opt.setName('url').setDescription('Image URL (must be direct link to image)').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('reset')
        .setDescription('Reset card to default appearance')
    )
    .addSubcommand(sub =>
      sub
        .setName('preview')
        .setDescription('Preview your current card settings')
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    if (!interaction.guild || !interaction.guildId) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(interaction.guildId) as any;

    if (!guildData?.leveling_enabled) {
      await interaction.reply({
        content: t('common.errors.module_disabled', locale, { module: 'leveling' }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    db.createGuild(interaction.guildId);
    db.createUser(interaction.user.id, interaction.user.tag);
    db.createGuildMember(interaction.guildId, interaction.user.id);

    if (subcommand === 'color') {
      const background = interaction.options.getString('background', true);
      const accent = interaction.options.getString('accent');

      const hexRegex = /^#[0-9A-F]{6}$/i;
      if (!hexRegex.test(background)) {
        await interaction.reply({
          content: t('commands.levelcard.invalid_color', locale, { color: 'background' }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (accent && !hexRegex.test(accent)) {
        await interaction.reply({
          content: t('commands.levelcard.invalid_color', locale, { color: 'accent' }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        const updates: any = { card_bg_color: background };
        if (accent) {
          updates.card_accent_color = accent;
        }

        db.updateGuildMemberCardSettings(interaction.guildId, interaction.user.id, updates);

        await interaction.reply({
          content: t('commands.levelcard.colors_updated', locale, {
            background,
            accent: accent || t('commands.levelcard.unchanged', locale)
          }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to update card colors:', error);
        await interaction.reply({
          content: t('commands.levelcard.update_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'image') {
      const url = interaction.options.getString('url', true);

      const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i;
      if (!urlRegex.test(url)) {
        await interaction.reply({
          content: t('commands.levelcard.invalid_image_url', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        db.updateGuildMemberCardSettings(interaction.guildId, interaction.user.id, { card_bg_image: url });

        await interaction.reply({
          content: t('commands.levelcard.image_updated', locale),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to update card image:', error);
        await interaction.reply({
          content: t('commands.levelcard.update_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'reset') {
      try {
        db.updateGuildMemberCardSettings(interaction.guildId, interaction.user.id, {
          card_bg_color: '#5865F2',
          card_accent_color: '#FFFFFF',
          card_bg_image: ''
        });

        await interaction.reply({
          content: t('commands.levelcard.reset', locale),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to reset card:', error);
        await interaction.reply({
          content: t('commands.levelcard.reset_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'preview') {
      const memberData = db.getGuildMember(interaction.guildId, interaction.user.id) as any;

      const embed = new EmbedBuilder()
        .setColor(parseInt(memberData?.card_bg_color?.replace('#', '') || '5865F2', 16))
        .setTitle(t('commands.levelcard.preview_title', locale))
        .setDescription(t('commands.levelcard.preview_description', locale))
        .addFields(
          { name: t('commands.levelcard.background_color', locale), value: memberData?.card_bg_color || '#5865F2', inline: true },
          { name: t('commands.levelcard.accent_color', locale), value: memberData?.card_accent_color || '#FFFFFF', inline: true },
          { name: t('commands.levelcard.background_image', locale), value: memberData?.card_bg_image || t('commands.levelcard.none', locale), inline: false }
        );

      if (memberData?.card_bg_image) {
        embed.setImage(memberData.card_bg_image);
      }

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

export default command;
