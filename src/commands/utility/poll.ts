import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Creates a poll with up to 10 options')
        .addStringOption(option =>
          option
            .setName('question')
            .setDescription('The poll question')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('option1')
            .setDescription('First option')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('option2')
            .setDescription('Second option')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('option3')
            .setDescription('Third option')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('option4')
            .setDescription('Fourth option')
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('option5')
            .setDescription('Fifth option')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Duration in minutes (optional)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10080)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('end')
        .setDescription('End a poll and show results')
        .addIntegerOption(option =>
          option
            .setName('poll_id')
            .setDescription('The poll ID to end')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List recent polls in this server')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

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
      const question = interaction.options.getString('question', true);
      const duration = interaction.options.getInteger('duration');
      const options: string[] = [];

      for (let i = 1; i <= 5; i++) {
        const option = interaction.options.getString(`option${i}`);
        if (option) options.push(option);
      }

      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

      let description = options
        .map((option, index) => `${emojis[index]} ${option}`)
        .join('\n\n');

      let endsAt: number | null = null;
      if (duration) {
        const endTime = Date.now() + duration * 60 * 1000;
        endsAt = Math.floor(endTime / 1000);
        description += `\n\n**${t('commands.poll.ends', locale)}:** <t:${endsAt}:R>`;
      } else {
        description += `\n\n**${t('commands.poll.no_time_limit', locale)}** - ${t('commands.poll.use_end_command', locale)}`;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 ${question}`)
        .setDescription(description)
        .setFooter({ text: t('commands.poll.created_by', locale, { user: interaction.user.tag }) })
        .setTimestamp();

      const response = await interaction.reply({ embeds: [embed], withResponse: true });
      const message = response.resource?.message;

      if (!message) {
        await interaction.followUp({
          content: t('commands.poll.failed_create', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      for (let i = 0; i < options.length; i++) {
        await message.react(emojis[i]);
      }

      try {
        const pollId = db.createPoll(
          interaction.guildId,
          interaction.channelId,
          question,
          options,
          endsAt,
          interaction.user.id
        );

        db.updatePollMessage(pollId, message.id);

        await interaction.followUp({
          content: t('commands.poll.created', locale, { id: pollId.toString() }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to save poll to database:', error);
        await interaction.followUp({
          content: t('commands.poll.warning_persist', locale),
          flags: MessageFlags.Ephemeral
        });
      }

    } else if (subcommand === 'end') {
      const pollId = interaction.options.getInteger('poll_id', true);
      const poll = db.getPollById(pollId) as any;

      if (!poll || poll.guild_id !== interaction.guildId) {
        await interaction.reply({
          content: t('commands.poll.not_found', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (poll.completed) {
        await interaction.reply({
          content: t('commands.poll.already_ended', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply();

      try {
        const channel = await interaction.guild?.channels.fetch(poll.channel_id);
        if (!channel || !channel.isTextBased()) {
          await interaction.editReply(t('commands.poll.channel_not_found', locale));
          return;
        }

        const message = await channel.messages.fetch(poll.message_id);
        if (!message) {
          await interaction.editReply(t('commands.poll.message_not_found', locale));
          return;
        }

        const options: string[] = JSON.parse(poll.options);
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
        const results: { option: string; count: number }[] = [];

        for (let i = 0; i < options.length; i++) {
          const reaction = message.reactions.cache.get(emojis[i]);
          const count = reaction ? reaction.count - 1 : 0;
          results.push({ option: options[i], count });
        }

        const totalVotes = results.reduce((sum, r) => sum + r.count, 0);
        const maxVotes = Math.max(...results.map(r => r.count));

        let resultsText = results.map((r, i) => {
          const percentage = totalVotes > 0 ? ((r.count / totalVotes) * 100).toFixed(1) : '0.0';
          const isWinner = r.count === maxVotes && r.count > 0;
          const bar = '█'.repeat(Math.floor((r.count / (maxVotes || 1)) * 15));
          const winner = isWinner ? ' 👑' : '';
          return `${emojis[i]} **${r.option}**${winner}\n${bar} ${r.count} ${t('commands.poll.votes', locale)} (${percentage}%)`;
        }).join('\n\n');

        const resultsEmbed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle(t('commands.poll.results_title', locale, { question: poll.question }))
          .setDescription(resultsText)
          .addFields({ name: t('commands.poll.total_votes', locale), value: totalVotes.toString(), inline: true })
          .setFooter({ text: t('commands.poll.ended_by', locale, { user: interaction.user.tag }) })
          .setTimestamp();

        await message.edit({ embeds: [resultsEmbed] });

        db.completePoll(pollId);

        await interaction.editReply(t('commands.poll.ended', locale, { id: pollId.toString() }));

      } catch (error) {
        logger.error('Failed to end poll:', error);
        await interaction.editReply(t('commands.poll.failed_end', locale));
      }

    } else if (subcommand === 'list') {
      const polls = db.getGuildPolls(interaction.guildId) as any[];

      if (!polls || polls.length === 0) {
        await interaction.reply({
          content: t('commands.poll.no_polls', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.poll.list_title', locale))
        .setDescription(
          polls.map((p, i) => {
            const status = p.completed ? t('commands.poll.status_ended', locale) : t('commands.poll.status_active', locale);
            const endTime = p.ends_at ? `${t('commands.poll.ends', locale)}: <t:${p.ends_at}:R>` : t('commands.poll.no_time_limit', locale);
            return `**${i + 1}.** ${status} - ${p.question} (ID: ${p.id})\n${endTime}`;
          }).join('\n\n')
        )
        .setFooter({ text: t('commands.poll.showing_last', locale, { count: polls.length.toString() }) });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
