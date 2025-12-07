import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType
} from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server XP leaderboard')
    .addIntegerOption(option =>
      option
        .setName('page')
        .setDescription('Page number to view')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply();

    const db = DatabaseManager.getInstance();
    const itemsPerPage = 10;
    let currentPage = interaction.options.getInteger('page') || 1;

    const allMembers = db.getLeaderboard(interaction.guild.id, 100) as any[];

    if (allMembers.length === 0) {
      await interaction.editReply({
        content: t('commands.leaderboard.no_data', locale)
      });
      return;
    }

    const totalPages = Math.ceil(allMembers.length / itemsPerPage);
    currentPage = Math.min(currentPage, totalPages);

    const generateEmbed = async (page: number): Promise<EmbedBuilder> => {
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageMembers = allMembers.slice(start, end);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.leaderboard.title', locale))
        .setDescription(`Showing ranks ${start + 1}-${Math.min(end, allMembers.length)} of ${allMembers.length}`)
        .setTimestamp()
        .setFooter({ text: `Page ${page}/${totalPages}` });

      let description = '';
      for (let i = 0; i < pageMembers.length; i++) {
        const member = pageMembers[i];
        const rank = start + i + 1;
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;

        const username = member.username || `User ${member.user_id}`;
        const level = member.level || 0;
        const xp = (member.xp || 0).toLocaleString();
        const messages = (member.messages || 0).toLocaleString();

        description += `${medal} **${username}**\n`;
        description += `   ${t('commands.leaderboard.level', locale)} ${level} • ${xp} ${t('commands.leaderboard.xp', locale)} • ${messages} ${t('commands.leaderboard.messages', locale)}\n\n`;
      }

      embed.setDescription(description);
      return embed;
    };

    const embed = await generateEmbed(currentPage);

    if (totalPages === 1) {
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('leaderboard_first')
        .setLabel('⏮️ First')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('leaderboard_prev')
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === 1),
      new ButtonBuilder()
        .setCustomId('leaderboard_next')
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(currentPage === totalPages),
      new ButtonBuilder()
        .setCustomId('leaderboard_last')
        .setLabel('Last ⏭️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === totalPages)
    );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [row]
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 300000
    });

    collector.on('collect', async i => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({
          content: t('commands.leaderboard.not_your_menu', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (i.customId === 'leaderboard_first') {
        currentPage = 1;
      } else if (i.customId === 'leaderboard_prev') {
        currentPage = Math.max(1, currentPage - 1);
      } else if (i.customId === 'leaderboard_next') {
        currentPage = Math.min(totalPages, currentPage + 1);
      } else if (i.customId === 'leaderboard_last') {
        currentPage = totalPages;
      }

      const newEmbed = await generateEmbed(currentPage);

      const newRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('leaderboard_first')
          .setLabel('⏮️ First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === 1),
        new ButtonBuilder()
          .setCustomId('leaderboard_prev')
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === 1),
        new ButtonBuilder()
          .setCustomId('leaderboard_next')
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(currentPage === totalPages),
        new ButtonBuilder()
          .setCustomId('leaderboard_last')
          .setLabel('Last ⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(currentPage === totalPages)
      );

      await i.update({
        embeds: [newEmbed],
        components: [newRow]
      });
    });

    collector.on('end', async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('leaderboard_first')
          .setLabel('⏮️ First')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('leaderboard_prev')
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('leaderboard_next')
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId('leaderboard_last')
          .setLabel('Last ⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true)
      );

      try {
        await response.edit({ components: [disabledRow] });
      } catch {
      }
    });
  }
};

export default command;
