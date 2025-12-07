import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags
} from 'discord.js';
import { Command, BotClient } from '../../types/index.js';
import { COMMAND_CATEGORIES, CategoryKey } from '../../utils/command-categories.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all available commands with an interactive menu'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const commands = (interaction.client as BotClient).commands;

    const homeEmbed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(t('commands.help.title', locale))
      .setDescription(
        t('commands.help.welcome', locale) + '\n\n' +
        `**${t('commands.help.total_commands', locale)}:** ${commands.size}\n` +
        `**${t('commands.help.categories', locale)}:** ${Object.keys(COMMAND_CATEGORIES).length}`
      )
      .addFields(
        Object.entries(COMMAND_CATEGORIES).map(([key, cat]) => ({
          name: cat.name,
          value: `${cat.description}\n\`${cat.commands.length} ${t('commands.help.commands_label', locale)}\``,
          inline: true
        }))
      )
      .setFooter({ text: t('commands.help.footer', locale) })
      .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category')
      .setPlaceholder(t('commands.help.select_placeholder', locale))
      .addOptions(
        Object.entries(COMMAND_CATEGORIES).map(([key, cat]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(cat.name)
            .setDescription(`${t('commands.help.view', locale)} ${cat.commands.length} ${key} ${t('commands.help.commands_label', locale)}`)
            .setValue(key)
            .setEmoji(cat.emoji)
        )
      );

    const homeButton = new ButtonBuilder()
      .setCustomId('help-home')
      .setLabel(t('commands.help.home_button', locale))
      .setStyle(ButtonStyle.Primary);

    const linkButton = new ButtonBuilder()
      .setLabel(t('commands.help.docs_button', locale))
      .setURL('https://github.com/d0mkaaa/osbot')
      .setStyle(ButtonStyle.Link);

    const selectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(homeButton, linkButton);

    const response = await interaction.reply({
      embeds: [homeEmbed],
      components: [selectRow, buttonRow]
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000
    });

    const buttonCollector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: t('commands.help.not_for_you', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const category = i.values[0] as CategoryKey;
      const categoryData = COMMAND_CATEGORIES[category];

      const categoryEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`${categoryData.emoji} ${categoryData.name}`)
        .setDescription(categoryData.description)
        .setFooter({ text: `${categoryData.commands.length} ${t('commands.help.commands_in_category', locale)}` })
        .setTimestamp();

      categoryData.commands.forEach(cmdName => {
        const cmd = commands.get(cmdName);
        if (cmd) {
          categoryEmbed.addFields({
            name: `/${cmd.data.name}`,
            value: cmd.data.description,
            inline: false
          });
        }
      });

      await i.update({ embeds: [categoryEmbed] });
    });

    buttonCollector.on('collect', async (i) => {
      if (i.customId === 'help-home') {
        if (i.user.id !== interaction.user.id) {
          await i.reply({
            content: t('commands.help.not_for_you', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        await i.update({ embeds: [homeEmbed] });
      }
    });

    collector.on('end', async () => {
      const disabledSelectMenu = StringSelectMenuBuilder.from(selectMenu).setDisabled(true);
      const disabledHomeButton = ButtonBuilder.from(homeButton).setDisabled(true);

      const disabledSelectRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(disabledSelectMenu);
      const disabledButtonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(disabledHomeButton, linkButton);

      try {
        await response.edit({ components: [disabledSelectRow, disabledButtonRow] });
      } catch (error) {
        logger.error('Failed to disable help menu:', error);
      }
    });
  }
};

export default command;
