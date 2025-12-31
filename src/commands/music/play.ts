import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, VoiceChannel, ActionRowBuilder, ButtonBuilder, ButtonStyle, ButtonInteraction, ComponentType, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { MusicManager } from '../../music/MusicManager.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import play from 'play-dl';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or add it to the queue')
    .addStringOption(option =>
      option
        .setName('query')
        .setDescription('Song name or URL')
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const locale = getInteractionLocale(interaction);

    if (!interaction.guild) {
      await interaction.editReply({
        content: t('common.errors.guild_only', locale)
      });
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel as VoiceChannel;

    if (!voiceChannel) {
      await interaction.editReply({
        content: t('common.music.not_in_voice', locale)
      });
      return;
    }

    const db = DatabaseManager.getInstance();
    const musicSettings = db.getOrCreateMusicSettings(interaction.guild.id);

    if (!musicSettings.enabled) {
      await interaction.editReply({
        content: t('commands.play.disabled', locale)
      });
      return;
    }

    if (musicSettings.dj_role_id) {
      const hasDjRole = member.roles.cache.has(musicSettings.dj_role_id);
      const hasAdminPerms = member.permissions.has(PermissionFlagsBits.Administrator);

      if (!hasDjRole && !hasAdminPerms) {
        await interaction.editReply({
          content: t('common.music.dj_only', locale)
        });
        return;
      }
    }

    const query = interaction.options.getString('query', true);
    const musicManager = MusicManager.getInstance();

    const isUrl = query.includes('youtube.com') || query.includes('youtu.be');

    if (isUrl) {
      let track;
      try {
        track = await musicManager.play(voiceChannel, query, interaction.user.tag);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('[PLAY CMD] Error in play command:', error);

        try {
          if (errorMessage.includes('No results found')) {
            await interaction.editReply(t('commands.play.no_results', locale, { query }));
          } else {
            await interaction.editReply(t('commands.play.error', locale));
          }
        } catch (replyError) {
          logger.error('[PLAY CMD] Failed to send error message (interaction expired)');
        }
        return;
      }

      const queue = musicManager.getQueue(interaction.guild.id);

      if (!queue) {
        try {
          await interaction.editReply(t('commands.play.error', locale));
        } catch (replyError) {
          logger.error('[PLAY CMD] Failed to send message (interaction expired)');
        }
        return;
      }

      try {
        if (queue.isPlaying && queue.currentTrack?.title === track.title) {
          await interaction.editReply(
            t('commands.play.now_playing', locale, { title: track.title })
          );
        } else {
          const position = queue.tracks.length + 1;
          await interaction.editReply(
            t('commands.play.added_to_queue', locale, {
              title: track.title,
              position: position.toString()
            })
          );
        }
      } catch (replyError) {
        logger.info('[PLAY CMD] Could not send reply (interaction expired), but music is playing');
      }
    } else {
      let searchResults;
      try {
        searchResults = await play.search(query, { limit: 5 });
      } catch (error) {
        logger.error('[PLAY CMD] Search error:', error);
        await interaction.editReply(t('commands.play.error', locale));
        return;
      }

      if (!searchResults || searchResults.length === 0) {
        await interaction.editReply(t('commands.play.no_results', locale, { query }));
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.play.search.title', locale))
        .setDescription(t('commands.play.search.description', locale, { query }))
        .setFooter({ text: t('commands.play.search.footer', locale) })
        .setTimestamp();

      searchResults.forEach((result, index) => {
        const duration = result.durationRaw || 'Unknown';
        const channelName = result.channel?.name || 'Unknown';
        const title = result.title || 'Unknown';
        const url = result.url;

        embed.addFields({
          name: `${index + 1}. ${title.substring(0, 100)}`,
          value: `📺 ${channelName} | ⏱️ ${duration}\n🔗 [Watch on YouTube](${url})`,
          inline: false
        });
      });

      const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
      const buttons = searchResults.map((result, index) =>
        new ButtonBuilder()
          .setCustomId(`play_${index}`)
          .setEmoji(numberEmojis[index])
          .setLabel(`${index + 1}`)
          .setStyle(ButtonStyle.Primary)
      );

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      const cancelButton = new ButtonBuilder()
        .setCustomId('play_cancel')
        .setLabel(t('commands.play.search.cancel', locale))
        .setStyle(ButtonStyle.Danger);

      const cancelRow = new ActionRowBuilder<ButtonBuilder>().addComponents(cancelButton);

      try {
        const message = await interaction.editReply({
          embeds: [embed],
          components: [actionRow, cancelRow]
        });

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
          filter: (i) => i.user.id === interaction.user.id
        });

        collector.on('collect', async (buttonInteraction: ButtonInteraction) => {
          if (buttonInteraction.customId === 'play_cancel') {
            collector.stop('cancelled');
            await buttonInteraction.update({
              content: t('commands.play.search.cancelled', locale),
              embeds: [],
              components: []
            });
            return;
          }

          const index = parseInt(buttonInteraction.customId.split('_')[1]);
          const selectedResult = searchResults[index];

          if (!selectedResult) {
            await buttonInteraction.update({
              content: t('commands.play.error', locale),
              embeds: [],
              components: []
            });
            return;
          }

          collector.stop('selected');

          await buttonInteraction.update({
            content: t('commands.play.search.loading', locale, { title: selectedResult.title || 'Unknown' }),
            embeds: [],
            components: []
          });

          let track;
          try {
            track = await musicManager.play(voiceChannel, selectedResult.url, interaction.user.tag);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('[PLAY CMD] Error playing selected track:', error);

            try {
              await buttonInteraction.editReply(t('commands.play.error', locale));
            } catch (replyError) {
              logger.error('[PLAY CMD] Failed to send error message (interaction expired)');
            }
            return;
          }

          const queue = musicManager.getQueue(interaction.guild!.id);

          if (!queue) {
            try {
              await buttonInteraction.editReply(t('commands.play.error', locale));
            } catch (replyError) {
              logger.error('[PLAY CMD] Failed to send message (interaction expired)');
            }
            return;
          }

          try {
            if (queue.isPlaying && queue.currentTrack?.title === track.title) {
              await buttonInteraction.editReply(
                t('commands.play.now_playing', locale, { title: track.title })
              );
            } else {
              const position = queue.tracks.length + 1;
              await buttonInteraction.editReply(
                t('commands.play.added_to_queue', locale, {
                  title: track.title,
                  position: position.toString()
                })
              );
            }
          } catch (replyError) {
            logger.info('[PLAY CMD] Could not send reply (interaction expired), but music is playing');
          }
        });

        collector.on('end', async (collected, reason) => {
          if (reason === 'time') {
            try {
              await interaction.editReply({
                content: t('commands.play.search.timeout', locale),
                embeds: [],
                components: []
              });
            } catch (error) {
              logger.error('[PLAY CMD] Failed to edit reply on timeout');
            }
          }
        });
      } catch (error) {
        logger.error('[PLAY CMD] Error creating search UI:', error);
        await interaction.editReply(t('commands.play.error', locale));
      }
    }
  }
};

export default command;
