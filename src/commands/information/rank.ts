import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags
} from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { CardGenerator } from '../../utils/card-generator.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('View your or someone else\'s rank and level')
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('The user to check (leave empty for yourself)')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('card')
        .setDescription('Show as text card (default: embed)')
        .setRequired(false)
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

    const db = DatabaseManager.getInstance();
    const guildData = db.getGuild(interaction.guild.id) as any;

    if (!guildData?.leveling_enabled) {
      await interaction.reply({
        content: t('common.errors.module_disabled', locale, { module: 'leveling' }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const targetUser = interaction.options.getUser('user') || interaction.user;
    const showCard = interaction.options.getBoolean('card') || false;

    db.createGuild(interaction.guild.id);
    db.createUser(targetUser.id, targetUser.tag);
    db.createGuildMember(interaction.guild.id, targetUser.id);

    const memberData = db.getGuildMember(interaction.guild.id, targetUser.id) as any;
    const rank = db.getUserRank(interaction.guild.id, targetUser.id);

    const currentXP = memberData?.xp || 0;
    const currentLevel = memberData?.level || 0;
    const messages = memberData?.messages || 0;

    const xpForCurrentLevel = db.getXPForLevel(currentLevel);
    const xpForNextLevel = db.getXPForLevel(currentLevel + 1);
    const xpNeeded = xpForNextLevel - currentXP;
    const xpProgress = currentXP - xpForCurrentLevel;
    const xpTotal = xpForNextLevel - xpForCurrentLevel;
    const progressPercentage = Math.floor((xpProgress / xpTotal) * 100);

    if (showCard) {
      const card = CardGenerator.generateTextCard({
        username: targetUser.tag,
        avatarURL: targetUser.displayAvatarURL(),
        rank,
        level: currentLevel,
        currentXP,
        xpForCurrentLevel,
        xpForNextLevel,
        messages,
        bgColor: memberData?.card_bg_color,
        accentColor: memberData?.card_accent_color,
        bgImage: memberData?.card_bg_image
      });

      await interaction.reply({ content: `\`\`\`\n${card}\n\`\`\`` });
      return;
    }

    const progressBar = createProgressBar(progressPercentage, 20);

    const bgColor = memberData?.card_bg_color || '#5865F2';
    const embed = new EmbedBuilder()
      .setColor(parseInt(bgColor.replace('#', ''), 16))
      .setAuthor({
        name: t('commands.rank.title', locale, { user: targetUser.tag }),
        iconURL: targetUser.displayAvatarURL()
      })
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: t('commands.rank.stats', locale),
          value:
            `**${t('commands.rank.rank', locale)}:** #${rank}\n` +
            `**${t('commands.rank.level', locale)}:** ${currentLevel}\n` +
            `**${t('commands.rank.xp', locale)}:** ${currentXP.toLocaleString()}\n` +
            `**${t('commands.rank.messages', locale)}:** ${messages.toLocaleString()}`,
          inline: true
        },
        {
          name: t('commands.rank.progress', locale),
          value:
            `**${t('commands.rank.current', locale)}:** ${xpProgress.toLocaleString()} XP\n` +
            `**${t('commands.rank.needed', locale)}:** ${xpNeeded.toLocaleString()} XP\n` +
            `**${t('commands.rank.next_level', locale)}:** ${currentLevel + 1}\n` +
            `**${t('commands.rank.progress_percent', locale)}:** ${progressPercentage}%`,
          inline: true
        },
        {
          name: t('commands.rank.level_progress', locale, { current: currentLevel.toString(), next: (currentLevel + 1).toString() }),
          value: `${progressBar} ${progressPercentage}%`,
          inline: false
        }
      )
      .setTimestamp()
      .setFooter({ text: `${interaction.guild.name}` });

    if (memberData?.card_bg_image) {
      embed.setImage(memberData.card_bg_image);
    }

    await interaction.reply({ embeds: [embed] });
  }
};

function createProgressBar(percentage: number, length: number = 20): string {
  const filled = Math.round((percentage / 100) * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

export default command;
