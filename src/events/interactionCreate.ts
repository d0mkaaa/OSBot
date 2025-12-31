import { Events, Interaction, MessageFlags, EmbedBuilder, ChannelType, TextChannel, AttachmentBuilder } from 'discord.js';
import { BotEvent, BotClient, Command } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { globalRateLimiter } from '../utils/rate-limit.js';
import { DatabaseManager } from '../database/Database.js';
import { buildCustomEmbed } from '../utils/embedBuilder.js';
import { AnalyticsTracker } from '../utils/analytics-tracker.js';
import { canExecuteCommand } from '../utils/command-restrictions.js';
import { getInteractionLocale } from '../utils/locale-helper.js';
import { t } from '../utils/i18n.js';

const event: BotEvent = {
  name: Events.InteractionCreate,

  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        if (!interaction.guild || !interaction.guildId) return;

        const db = DatabaseManager.getInstance();
        const ticket = db.getTicket(interaction.channelId) as any;

        if (!ticket) {
          await interaction.reply({
            content: '❌ This is not a ticket channel!',
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
          logger.error('Failed to close ticket via button:', error);
          await interaction.editReply({
            content: '❌ Failed to close ticket.'
          });
        }
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const client = interaction.client as BotClient;
    const command: Command | undefined = client.commands.get(interaction.commandName);

    if (!command) {
      logger.warn(`No command matching ${interaction.commandName} was found`);
      return;
    }

    if (!canExecuteCommand(interaction)) {
      const locale = getInteractionLocale(interaction);
      await interaction.reply({
        content: t('commands.commandrestrict.blocked', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (globalRateLimiter.isOnCooldown(interaction.user.id, interaction.commandName)) {
      const remaining = globalRateLimiter.getRemainingCooldown(interaction.user.id, interaction.commandName);
      await interaction.reply({
        content: `⏱️ This command is on cooldown. Please wait ${remaining} second${remaining === 1 ? '' : 's'}.`,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.guildId) {
      const db = DatabaseManager.getInstance();
      const guildConfig = db.getGuild(interaction.guildId) as any;

      const musicCommands = ['play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying', 'loop', 'shuffle', 'volume', 'voteskip'];
      const moderationCommands = ['ban', 'kick', 'warn', 'mute', 'unmute', 'clear', 'lockdown', 'softban', 'tempban', 'unban', 'slowmode', 'massrole'];
      const ticketCommands = ['ticket'];
      const levelingCommands = ['rank', 'leaderboard', 'setlevel', 'addxp', 'removexp'];

      if (guildConfig) {
        if (!guildConfig.music_enabled && musicCommands.includes(interaction.commandName)) {
          await interaction.reply({
            content: '🎵 Music system is disabled on this server.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (!guildConfig.moderation_enabled && moderationCommands.includes(interaction.commandName)) {
          await interaction.reply({
            content: '🔨 Moderation features are disabled on this server.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (!guildConfig.tickets_enabled && ticketCommands.includes(interaction.commandName)) {
          await interaction.reply({
            content: '🎫 Ticket system is disabled on this server.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        if (!guildConfig.leveling_enabled && levelingCommands.includes(interaction.commandName)) {
          await interaction.reply({
            content: '📈 Leveling system is disabled on this server.',
            flags: MessageFlags.Ephemeral
          });
          return;
        }
      }
    }

    try {
      await command.execute(interaction);
      globalRateLimiter.setCooldown(interaction.user.id, interaction.commandName);

      if (interaction.guildId) {
        const analytics = AnalyticsTracker.getInstance();
        analytics.trackCommand(interaction.guildId, interaction.commandName);
      }

      logger.info(`${interaction.user.tag} executed /${interaction.commandName}`);
    } catch (error) {
      logger.error(`Error executing ${interaction.commandName}`, error);

      const errorContent = 'There was an error while executing this command!';

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: errorContent,
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: errorContent,
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

export default event;
