import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, TextChannel, ChannelType } from 'discord.js';
import { Command } from '../../types/index.js';
import { AuditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Lock or unlock a channel to prevent members from sending messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addSubcommand(sub =>
      sub
        .setName('lock')
        .setDescription('Lock a channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to lock (current channel if not specified)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for locking')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('unlock')
        .setDescription('Unlock a channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to unlock (current channel if not specified)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for unlocking')
            .setRequired(false)
        )
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

    const subcommand = interaction.options.getSubcommand();
    const targetChannel = (interaction.options.getChannel('channel') as TextChannel) || interaction.channel as TextChannel;
    const reason = interaction.options.getString('reason') || t('commands.auditlog.no_reason', locale);

    if (targetChannel.type !== ChannelType.GuildText) {
      await interaction.reply({
        content: t('commands.lockdown.text_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      const everyoneRole = interaction.guild.roles.everyone;

      if (subcommand === 'lock') {
        await targetChannel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: false
        });

        const auditLogger = new AuditLogger();
        await auditLogger.log({
          guild: interaction.guild,
          action: 'Channel Locked',
          moderator: interaction.user,
          target: targetChannel.id,
          reason,
          details: { channel: targetChannel.name }
        });

        await targetChannel.send({
          content: t('commands.lockdown.lock_message', locale, {
            user: `${interaction.user}`,
            reason
          })
        });

        await interaction.reply({
          content: t('commands.lockdown.lock_success', locale, { channel: `${targetChannel}` }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'unlock') {
        await targetChannel.permissionOverwrites.edit(everyoneRole, {
          SendMessages: null
        });

        const auditLogger = new AuditLogger();
        await auditLogger.log({
          guild: interaction.guild,
          action: 'Channel Unlocked',
          moderator: interaction.user,
          target: targetChannel.id,
          reason,
          details: { channel: targetChannel.name }
        });

        await targetChannel.send({
          content: t('commands.lockdown.unlock_message', locale, {
            user: `${interaction.user}`,
            reason
          })
        });

        await interaction.reply({
          content: t('commands.lockdown.unlock_success', locale, { channel: `${targetChannel}` }),
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      await interaction.reply({
        content: t('commands.lockdown.failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
