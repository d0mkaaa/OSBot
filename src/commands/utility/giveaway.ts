import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Manage giveaways')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption(option =>
          option
            .setName('prize')
            .setDescription('What to give away')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Duration in minutes')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(10080)
        )
        .addIntegerOption(option =>
          option
            .setName('winners')
            .setDescription('Number of winners (default: 1)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List recent giveaways in this server')
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addIntegerOption(option =>
          option
            .setName('giveaway_id')
            .setDescription('The giveaway ID to end')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for a completed giveaway')
        .addStringOption(option =>
          option
            .setName('message_id')
            .setDescription('The message ID of the giveaway')
            .setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    if (!interaction.guildId) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const db = DatabaseManager.getInstance();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'start') {
      const prize = interaction.options.getString('prize', true);
      const duration = interaction.options.getInteger('duration', true);
      const winners = interaction.options.getInteger('winners') || 1;

      const endTime = Date.now() + duration * 60 * 1000;
      const endsAt = Math.floor(endTime / 1000);

      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(t('commands.giveaway.title', locale))
        .setDescription(
          t('commands.giveaway.prize', locale, { prize }) + `\n` +
          t('commands.giveaway.winners', locale, { count: winners.toString() }) + `\n` +
          t('commands.giveaway.ends', locale, { time: endsAt.toString() }) + `\n\n` +
          t('commands.giveaway.react_to_enter', locale)
        )
        .setFooter({ text: t('commands.giveaway.hosted_by', locale, { user: interaction.user.tag }) })
        .setTimestamp(endTime);

      const response = await interaction.reply({
        embeds: [embed],
        withResponse: true
      });

      if (!response.resource) {
        await interaction.followUp({
          content: t('commands.giveaway.create_failed', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const message = response.resource.message;
      if (!message) {
        await interaction.followUp({
          content: t('commands.giveaway.create_failed', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await message.react('🎉');

      try {
        const giveawayId = db.createGiveaway(
          interaction.guildId,
          interaction.channelId,
          prize,
          winners,
          endsAt,
          interaction.user.id
        );

        db.updateGiveawayMessage(giveawayId, message.id);
      } catch (error) {
        logger.error('Failed to save giveaway to database:', error);
        await interaction.followUp({
          content: t('commands.giveaway.warning_persist', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'list') {
      const giveaways = db.getGuildGiveaways(interaction.guildId) as any[];

      if (!giveaways || giveaways.length === 0) {
        await interaction.reply({
          content: t('commands.giveaway.no_giveaways', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.giveaway.list_title', locale))
        .setDescription(
          giveaways.map((g, i) => {
            const status = g.completed ? t('commands.giveaway.status_ended', locale) : t('commands.giveaway.status_active', locale);
            const endTime = `<t:${g.ends_at}:R>`;
            return `**${i + 1}.** ${status} - ${g.prize} (ID: ${g.id})\n${t('commands.giveaway.ends', locale, { time: endTime })}`;
          }).join('\n\n')
        )
        .setFooter({ text: t('commands.giveaway.showing_last', locale, { count: giveaways.length.toString() }) });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    } else if (subcommand === 'end') {
      const giveawayId = interaction.options.getInteger('giveaway_id', true);
      const giveaway = db.getGiveawayById(giveawayId) as any;

      if (!giveaway || giveaway.guild_id !== interaction.guildId) {
        await interaction.reply({
          content: t('commands.giveaway.not_found', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (giveaway.completed) {
        await interaction.reply({
          content: t('commands.giveaway.already_ended', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.completeGiveaway(giveawayId);

      await interaction.reply({
        content: t('commands.giveaway.ended', locale, { id: giveawayId.toString(), prize: giveaway.prize }),
        flags: MessageFlags.Ephemeral
      });
    } else if (subcommand === 'reroll') {
      const messageId = interaction.options.getString('message_id', true);

      try {
        const message = await interaction.channel?.messages.fetch(messageId);
        if (!message) {
          await interaction.reply({
            content: t('commands.giveaway.message_not_found', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const reaction = message.reactions.cache.get('🎉');
        if (!reaction) {
          await interaction.reply({
            content: t('commands.giveaway.no_reactions', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const users = await reaction.users.fetch();
        const participants = users.filter(u => !u.bot);

        if (participants.size === 0) {
          await interaction.reply({
            content: t('commands.giveaway.no_participants', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const participantsArray = Array.from(participants.values());
        const winner = participantsArray[Math.floor(Math.random() * participantsArray.length)];

        await interaction.reply({
          content: t('commands.giveaway.reroll_success', locale, { winner: `${winner}` })
        });
      } catch (error) {
        logger.error('Failed to reroll giveaway:', error);
        await interaction.reply({
          content: t('commands.giveaway.reroll_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

export default command;
