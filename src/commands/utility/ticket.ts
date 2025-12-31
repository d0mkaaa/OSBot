import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, ChannelType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, TextChannel, AttachmentBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { buildCustomEmbed } from '../../utils/embedBuilder.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support tickets')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a new support ticket')
        .addStringOption(opt => opt.setName('subject').setDescription('Brief description of your issue'))
    )
    .addSubcommand(sub =>
      sub
        .setName('close')
        .setDescription('Close the current ticket (staff only)')
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a user to the ticket (staff only)')
        .addUserOption(opt => opt.setName('user').setDescription('User to add').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the ticket (staff only)')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Configure ticket system (admin only)')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('Category for ticket channels')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption(opt =>
          opt
            .setName('support_role')
            .setDescription('Role to mention in new tickets')
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt
            .setName('log_channel')
            .setDescription('Channel to log closed tickets')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('stats')
        .setDescription('View ticket statistics (staff only)')
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

    if (!guildData?.tickets_enabled) {
      await interaction.reply({
        content: t('common.errors.module_disabled', locale, { module: 'tickets' }),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'setup') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
        await interaction.reply({
          content: t('commands.ticket.need_admin', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const category = interaction.options.getChannel('category', true);
      const supportRole = interaction.options.getRole('support_role');
      const logChannel = interaction.options.getChannel('log_channel');

      try {
        const updateData: Record<string, string> = {
          ticket_category_id: category.id
        };

        if (supportRole) {
          updateData.ticket_support_role_id = supportRole.id;
        }

        if (logChannel) {
          updateData.ticket_log_channel_id = logChannel.id;
        }

        db.updateGuild(interaction.guildId, updateData);

        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle(t('commands.ticket.setup_success_title', locale))
          .setDescription(
            `**${t('commands.ticket.category', locale)}:** ${category}\n` +
            `**${t('commands.ticket.support_role', locale)}:** ${supportRole || t('commands.ticket.not_set', locale)}\n` +
            `**${t('commands.ticket.log_channel', locale)}:** ${logChannel || t('commands.ticket.not_set', locale)}`
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to configure ticket system:', error);
        await interaction.reply({
          content: t('commands.ticket.setup_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'create') {
      const guildData = db.getGuild(interaction.guildId) as any;
      const maxOpenTickets = guildData?.ticket_max_open || 1;

      const existingTickets = db.getUserTickets(interaction.guildId, interaction.user.id) as any[];
      const openTickets = existingTickets.filter(t => t.status === 'open');

      if (openTickets.length >= maxOpenTickets) {
        const ticketList = openTickets.map(t => `<#${t.channel_id}>`).join(', ');
        await interaction.reply({
          content: t('commands.ticket.max_tickets', locale, {
            count: maxOpenTickets.toString(),
            plural: maxOpenTickets > 1 ? 's' : '',
            tickets: ticketList
          }),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const subject = interaction.options.getString('subject') || t('commands.ticket.no_subject', locale);

      try {
        let categoryId = guildData?.ticket_category_id;
        const supportRoleId = guildData?.ticket_support_role_id;
        const namingFormat = guildData?.ticket_naming_format || 'username';

        let category;
        if (categoryId) {
          category = await interaction.guild.channels.fetch(categoryId);
          if (!category || category.type !== ChannelType.GuildCategory) {
            categoryId = null;
          }
        }

        if (!categoryId) {
          category = interaction.guild.channels.cache.find(
            c => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === 'tickets'
          );

          if (!category) {
            category = await interaction.guild.channels.create({
              name: 'Tickets',
              type: ChannelType.GuildCategory
            });
          }
        }

        const permissionOverwrites: any[] = [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          },
          {
            id: interaction.client.user!.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
          }
        ];

        if (supportRoleId) {
          permissionOverwrites.push({
            id: supportRoleId,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
          });
        }

        let ticketName: string;
        if (namingFormat === 'number') {
          const allTickets = db.getAllTickets(interaction.guildId) as any[];
          const ticketNumber = allTickets.length + 1;
          ticketName = `ticket-${ticketNumber}`;
        } else {
          ticketName = `ticket-${interaction.user.username}`;
        }

        const ticketChannel = await interaction.guild.channels.create({
          name: ticketName,
          type: ChannelType.GuildText,
          parent: category?.id,
          permissionOverwrites
        });

        db.createTicket(interaction.guildId, ticketChannel.id, interaction.user.id, subject);

        let embed: EmbedBuilder;

        if (guildData?.ticket_open_embed) {
          try {
            const embedConfig = JSON.parse(guildData.ticket_open_embed);
            embed = buildCustomEmbed(embedConfig, {
              user: `${interaction.user}`,
              userTag: interaction.user.tag,
              userAvatar: interaction.user.displayAvatarURL(),
              subject: subject
            });
          } catch (error) {
            logger.error('Failed to parse ticket_open_embed, using default:', error);
            const ticketOpenMessage = guildData?.ticket_open_message ||
              'Welcome {user}!\n\n**Subject:** {subject}\n\nA staff member will be with you shortly. Please describe your issue in detail.';

            const formattedMessage = ticketOpenMessage
              .replace(/\\n/g, '\n')
              .replace(/{user}/g, `${interaction.user}`)
              .replace(/{subject}/g, subject);

            embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('🎫 Support Ticket')
              .setDescription(formattedMessage)
              .setFooter({ text: 'To close this ticket, use /ticket close' })
              .setTimestamp();
          }
        } else {
          const ticketOpenMessage = guildData?.ticket_open_message ||
            'Welcome {user}!\n\n**Subject:** {subject}\n\nA staff member will be with you shortly. Please describe your issue in detail.';

          const formattedMessage = ticketOpenMessage
            .replace(/\\n/g, '\n')
            .replace(/{user}/g, `${interaction.user}`)
            .replace(/{subject}/g, subject);

          embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎫 Support Ticket')
            .setDescription(formattedMessage)
            .setFooter({ text: 'To close this ticket, use /ticket close' })
            .setTimestamp();
        }

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
        );

        const mentionContent = supportRoleId ? `${interaction.user} <@&${supportRoleId}>` : `${interaction.user}`;
        await ticketChannel.send({ content: mentionContent, embeds: [embed], components: [row] });

        await interaction.editReply({
          content: t('commands.ticket.created', locale, { channel: `${ticketChannel}` })
        });
      } catch (error) {
        logger.error('Failed to create ticket:', error);
        await interaction.editReply({
          content: t('commands.ticket.create_failed', locale)
        });
      }
    } else if (subcommand === 'close') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
          content: t('commands.ticket.need_manage_channels', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const ticket = db.getTicket(interaction.channelId) as any;

      if (!ticket) {
        await interaction.reply({
          content: t('commands.ticket.not_ticket_channel', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      await interaction.deferReply();

      try {
        const guildData = db.getGuild(interaction.guildId) as any;
        const logChannelId = guildData?.ticket_log_channel_id;

        const channel = interaction.channel;
        let transcript = '';
        let transcriptJson = '[]';
        let channelName = 'unknown';

        if (channel && channel.type === ChannelType.GuildText) {
          const textChannel = channel as TextChannel;
          channelName = textChannel.name;

          const messages = await textChannel.messages.fetch({ limit: 100 });
          const sortedMessages = [...messages.values()].reverse();

          const transcriptData = sortedMessages.map(msg => ({
            id: msg.id,
            author: {
              id: msg.author.id,
              username: msg.author.username,
              discriminator: msg.author.discriminator,
              avatar: msg.author.displayAvatarURL(),
              bot: msg.author.bot
            },
            content: msg.content,
            timestamp: msg.createdTimestamp,
            attachments: msg.attachments.map(att => ({
              url: att.url,
              name: att.name,
              contentType: att.contentType
            })),
            embeds: msg.embeds.map(embed => ({
              title: embed.title,
              description: embed.description,
              color: embed.color
            }))
          }));
          transcriptJson = JSON.stringify(transcriptData);

          transcript = `Ticket Transcript - ${channelName}\n`;
          transcript += `Closed by: ${interaction.user.tag}\n`;
          transcript += `Closed at: ${new Date().toISOString()}\n`;
          transcript += `\n${'='.repeat(50)}\n\n`;

          for (const msg of sortedMessages) {
            const timestamp = msg.createdAt.toISOString();
            transcript += `[${timestamp}] ${msg.author.tag}: ${msg.content}\n`;
            if (msg.embeds.length > 0) {
              transcript += `  [Embed: ${msg.embeds[0].title || 'No title'}]\n`;
            }
            if (msg.attachments.size > 0) {
              msg.attachments.forEach(att => {
                transcript += `  [Attachment: ${att.url}]\n`;
              });
            }
          }
        }

        if (logChannelId && transcript) {
          try {
            const logChannel = await interaction.guild.channels.fetch(logChannelId);
            if (logChannel && logChannel.isTextBased()) {
              const attachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), {
                name: `ticket-${ticket.channel_id}.txt`
              });

              const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🔒 Ticket Closed')
                .setDescription(
                  `**Ticket:** ${channelName}\n` +
                  `**User:** <@${ticket.user_id}>\n` +
                  `**Closed by:** ${interaction.user}\n` +
                  `**Subject:** ${ticket.subject || 'No subject'}`
                )
                .setTimestamp();

              await logChannel.send({ embeds: [logEmbed], files: [attachment] });
            }
          } catch (error) {
            logger.error('Failed to send transcript to log channel:', error);
          }
        }

        const dmTranscriptEnabled = guildData?.ticket_dm_transcript !== false;
        if (transcript && dmTranscriptEnabled) {
          try {
            const ticketUser = await interaction.client.users.fetch(ticket.user_id);
            const dmAttachment = new AttachmentBuilder(Buffer.from(transcript, 'utf-8'), {
              name: `ticket-${ticket.id}-transcript.txt`
            });

            let dmEmbed: EmbedBuilder;

            if (guildData?.ticket_dm_embed) {
              try {
                const embedConfig = JSON.parse(guildData.ticket_dm_embed);
                dmEmbed = buildCustomEmbed(embedConfig, {
                  user: `${ticketUser}`,
                  userTag: ticketUser.tag,
                  userAvatar: ticketUser.displayAvatarURL(),
                  server: interaction.guild.name,
                  subject: ticket.subject || 'No subject',
                  closer: `${interaction.user}`,
                  closerTag: interaction.user.tag
                });
              } catch (error) {
                logger.error('Failed to parse ticket_dm_embed, using default:', error);
                const ticketDmMessage = guildData?.ticket_dm_message ||
                  'Your ticket in **{server}** has been closed.\n\n**Subject:** {subject}\n**Closed by:** {closer}\n\nA transcript of your ticket has been attached for your records.';

                const formattedDmMessage = ticketDmMessage
                  .replace(/\\n/g, '\n')
                  .replace(/{user}/g, `${ticketUser}`)
                  .replace(/{server}/g, interaction.guild.name)
                  .replace(/{subject}/g, ticket.subject || 'No subject')
                  .replace(/{closer}/g, interaction.user.tag);

                dmEmbed = new EmbedBuilder()
                  .setColor(0x5865F2)
                  .setTitle('🎫 Your Ticket Transcript')
                  .setDescription(formattedDmMessage)
                  .setTimestamp();
              }
            } else {
              const ticketDmMessage = guildData?.ticket_dm_message ||
                'Your ticket in **{server}** has been closed.\n\n**Subject:** {subject}\n**Closed by:** {closer}\n\nA transcript of your ticket has been attached for your records.';

              const formattedDmMessage = ticketDmMessage
                .replace(/\\n/g, '\n')
                .replace(/{user}/g, `${ticketUser}`)
                .replace(/{server}/g, interaction.guild.name)
                .replace(/{subject}/g, ticket.subject || 'No subject')
                .replace(/{closer}/g, interaction.user.tag);

              dmEmbed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🎫 Your Ticket Transcript')
                .setDescription(formattedDmMessage)
                .setTimestamp();
            }

            await ticketUser.send({ embeds: [dmEmbed], files: [dmAttachment] });
          } catch (error) {
            logger.error('Failed to send transcript to user via DM:', error);
          }
        }

        db.closeTicket(interaction.channelId, interaction.user.id, transcriptJson);

        let closeEmbed: EmbedBuilder;

        if (guildData?.ticket_close_embed) {
          try {
            const embedConfig = JSON.parse(guildData.ticket_close_embed);
            closeEmbed = buildCustomEmbed(embedConfig, {
              closer: `${interaction.user}`,
              closerTag: interaction.user.tag
            });
          } catch (error) {
            logger.error('Failed to parse ticket_close_embed, using default:', error);
            const ticketCloseMessage = guildData?.ticket_close_message ||
              'This ticket has been closed by {closer}.';

            const formattedCloseMessage = ticketCloseMessage
              .replace(/\\n/g, '\n')
              .replace(/{closer}/g, `${interaction.user}`);

            closeEmbed = new EmbedBuilder()
              .setColor(0xFF0000)
              .setTitle('🔒 Ticket Closed')
              .setDescription(formattedCloseMessage)
              .setTimestamp();
          }
        } else {
          const ticketCloseMessage = guildData?.ticket_close_message ||
            'This ticket has been closed by {closer}.';

          const formattedCloseMessage = ticketCloseMessage
            .replace(/\\n/g, '\n')
            .replace(/{closer}/g, `${interaction.user}`);

          closeEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🔒 Ticket Closed')
            .setDescription(formattedCloseMessage)
            .setTimestamp();
        }

        await interaction.editReply({ embeds: [closeEmbed] });

        setTimeout(async () => {
          const channelToDelete = await interaction.guild!.channels.fetch(interaction.channelId);
          if (channelToDelete) {
            await channelToDelete.delete();
          }
        }, 5000);
      } catch (error) {
        logger.error('Failed to close ticket:', error);
        await interaction.editReply({
          content: t('commands.ticket.close_failed', locale)
        });
      }
    } else if (subcommand === 'add') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
          content: t('commands.ticket.need_manage_channels', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const ticket = db.getTicket(interaction.channelId) as any;

      if (!ticket) {
        await interaction.reply({
          content: t('commands.ticket.not_ticket_channel', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const user = interaction.options.getUser('user', true);
      const channel = interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: t('commands.ticket.invalid_channel', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        await channel.permissionOverwrites.create(user.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true
        });

        await interaction.reply({
          content: t('commands.ticket.user_added', locale, { user: `${user}` })
        });
      } catch (error) {
        logger.error('Failed to add user to ticket:', error);
        await interaction.reply({
          content: t('commands.ticket.add_user_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'remove') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
          content: t('commands.ticket.need_manage_channels', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const ticket = db.getTicket(interaction.channelId) as any;

      if (!ticket) {
        await interaction.reply({
          content: t('commands.ticket.not_ticket_channel', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const user = interaction.options.getUser('user', true);
      const channel = interaction.channel;

      if (!channel || channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: t('commands.ticket.invalid_channel', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        await channel.permissionOverwrites.delete(user.id);

        await interaction.reply({
          content: t('commands.ticket.user_removed', locale, { user: `${user}` })
        });
      } catch (error) {
        logger.error('Failed to remove user from ticket:', error);
        await interaction.reply({
          content: t('commands.ticket.remove_user_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'stats') {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
          content: t('commands.ticket.need_manage_channels', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        const allTickets = db.getAllTickets(interaction.guildId) as any[];
        const openTickets = allTickets.filter(t => t.status === 'open');
        const closedTickets = allTickets.filter(t => t.status === 'closed');

        const ticketsByUser = new Map<string, number>();
        allTickets.forEach(ticket => {
          const count = ticketsByUser.get(ticket.user_id) || 0;
          ticketsByUser.set(ticket.user_id, count + 1);
        });

        const topUsers = [...ticketsByUser.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        let topUsersText = '';
        for (const [userId, count] of topUsers) {
          topUsersText += `<@${userId}>: ${count} tickets\n`;
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.ticket.stats_title', locale))
          .addFields(
            { name: t('commands.ticket.total_tickets', locale), value: allTickets.length.toString(), inline: true },
            { name: t('commands.ticket.open_tickets', locale), value: openTickets.length.toString(), inline: true },
            { name: t('commands.ticket.closed_tickets', locale), value: closedTickets.length.toString(), inline: true }
          )
          .setTimestamp();

        if (topUsersText) {
          embed.addFields({ name: t('commands.ticket.top_users', locale), value: topUsersText || t('commands.ticket.no_tickets_yet', locale) });
        }

        await interaction.reply({ embeds: [embed] });
      } catch (error) {
        logger.error('Failed to get ticket statistics:', error);
        await interaction.reply({
          content: t('commands.ticket.stats_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

export default command;
