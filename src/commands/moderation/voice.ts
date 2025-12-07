import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, GuildMember, ChannelType } from 'discord.js';
import { Command } from '../../types/index.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { DatabaseManager } from '../../database/Database.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('voice')
    .setDescription('Voice channel moderation commands')
    .addSubcommand(subcommand =>
      subcommand
        .setName('mute')
        .setDescription('Server mute a member in voice')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Member to mute')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for muting')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('unmute')
        .setDescription('Server unmute a member in voice')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Member to unmute')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('deafen')
        .setDescription('Server deafen a member in voice')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Member to deafen')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for deafening')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('undeafen')
        .setDescription('Server undeafen a member in voice')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Member to undeafen')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('disconnect')
        .setDescription('Disconnect a member from voice')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Member to disconnect')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for disconnecting')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('move')
        .setDescription('Move a member to another voice channel')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('Member to move')
            .setRequired(true)
        )
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to move to')
            .addChannelTypes(ChannelType.GuildVoice)
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for moving')
            .setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MuteMembers),

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
    const user = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || t('commands.voice.no_reason', locale);

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) {
      await interaction.reply({
        content: t('commands.voice.not_in_server', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const executor = interaction.member as GuildMember;

    if (member.roles.highest.position >= executor.roles.highest.position && executor.id !== interaction.guild.ownerId) {
      await interaction.reply({
        content: t('commands.voice.higher_role', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const db = DatabaseManager.getInstance();

    try {
      if (subcommand === 'mute') {
        if (!member.voice.channel) {
          await interaction.reply({
            content: t('commands.voice.not_in_voice', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await member.voice.setMute(true, reason);

        const caseNumber = db.createCase(
          interaction.guild.id,
          'Voice Mute',
          user.id,
          interaction.user.id,
          reason
        );

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Voice Mute',
          moderator: interaction.user,
          target: user,
          reason,
          details: { channel: member.voice.channel.name, caseNumber }
        });

        await interaction.reply({
          content: t('commands.voice.mute_success', locale, {
            user: user.tag,
            channel: member.voice.channel.name,
            reason,
            case: caseNumber.toString()
          }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'unmute') {
        if (!member.voice.channel) {
          await interaction.reply({
            content: t('commands.voice.not_in_voice', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await member.voice.setMute(false);

        await auditLogger.log({
          guild: interaction.guild,
          action: 'MEMBER_UNTIMEOUT',
          moderator: interaction.user,
          target: user,
          reason: 'Voice unmuted',
          details: { channel: member.voice.channel.name }
        });

        await interaction.reply({
          content: t('commands.voice.unmute_success', locale, {
            user: user.tag,
            channel: member.voice.channel.name
          }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'deafen') {
        if (!member.voice.channel) {
          await interaction.reply({
            content: t('commands.voice.not_in_voice', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await member.voice.setDeaf(true, reason);

        const caseNumber = db.createCase(
          interaction.guild.id,
          'Voice Deafen',
          user.id,
          interaction.user.id,
          reason
        );

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Voice Deafen',
          moderator: interaction.user,
          target: user,
          reason,
          details: { channel: member.voice.channel.name, caseNumber }
        });

        await interaction.reply({
          content: t('commands.voice.deafen_success', locale, {
            user: user.tag,
            channel: member.voice.channel.name,
            reason,
            case: caseNumber.toString()
          }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'undeafen') {
        if (!member.voice.channel) {
          await interaction.reply({
            content: t('commands.voice.not_in_voice', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await member.voice.setDeaf(false);

        await auditLogger.log({
          guild: interaction.guild,
          action: 'MEMBER_UNTIMEOUT',
          moderator: interaction.user,
          target: user,
          reason: 'Voice undeafened',
          details: { channel: member.voice.channel.name }
        });

        await interaction.reply({
          content: t('commands.voice.undeafen_success', locale, {
            user: user.tag,
            channel: member.voice.channel.name
          }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'disconnect') {
        if (!member.voice.channel) {
          await interaction.reply({
            content: t('commands.voice.not_in_voice', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const channelName = member.voice.channel.name;
        await member.voice.disconnect(reason);

        const caseNumber = db.createCase(
          interaction.guild.id,
          'Voice Disconnect',
          user.id,
          interaction.user.id,
          reason
        );

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Voice Disconnect',
          moderator: interaction.user,
          target: user,
          reason,
          details: { channel: channelName, caseNumber }
        });

        await interaction.reply({
          content: t('commands.voice.disconnect_success', locale, {
            user: user.tag,
            channel: channelName,
            reason,
            case: caseNumber.toString()
          }),
          flags: MessageFlags.Ephemeral
        });
      } else if (subcommand === 'move') {
        if (!member.voice.channel) {
          await interaction.reply({
            content: t('commands.voice.not_in_voice', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const targetChannel = interaction.options.getChannel('channel', true);
        const oldChannel = member.voice.channel.name;

        await member.voice.setChannel(targetChannel.id, reason);

        const caseNumber = db.createCase(
          interaction.guild.id,
          'Voice Move',
          user.id,
          interaction.user.id,
          reason
        );

        await auditLogger.log({
          guild: interaction.guild,
          action: 'Voice Move',
          moderator: interaction.user,
          target: user,
          reason,
          details: { from: oldChannel, to: targetChannel.name, caseNumber }
        });

        await interaction.reply({
          content: t('commands.voice.move_success', locale, {
            user: user.tag,
            from: oldChannel,
            to: targetChannel.name || 'Unknown',
            reason,
            case: caseNumber.toString()
          }),
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error: any) {
      await interaction.reply({
        content: t('commands.voice.failed', locale, { error: error.message }),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
