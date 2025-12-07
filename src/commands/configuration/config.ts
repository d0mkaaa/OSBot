import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  MessageFlags,
  TextChannel
} from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { security } from '../../utils/security.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings for this server')
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome')
        .setDescription('Configure welcome messages')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for welcome messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Welcome message ({user} and {server} placeholders)')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable welcome messages')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('goodbye')
        .setDescription('Configure goodbye messages')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for goodbye messages')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('message')
            .setDescription('Goodbye message ({user} and {server} placeholders)')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable goodbye messages')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('modlog')
        .setDescription('Set moderation log channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for moderation logs')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('autorole')
        .setDescription('Set auto-role for new members')
        .addRoleOption(option =>
          option
            .setName('role')
            .setDescription('Role to auto-assign')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('xp')
        .setDescription('Configure XP and leveling system')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable XP system')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('min')
            .setDescription('Minimum XP per message (default: 15)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addIntegerOption(option =>
          option
            .setName('max')
            .setDescription('Maximum XP per message (default: 25)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addIntegerOption(option =>
          option
            .setName('cooldown')
            .setDescription('XP gain cooldown in seconds (default: 60)')
            .setRequired(false)
            .setMinValue(10)
            .setMaxValue(300)
        )
        .addChannelOption(option =>
          option
            .setName('levelchannel')
            .setDescription('Channel for level-up messages (leave empty for current channel)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('levelmessage')
            .setDescription('Level-up message ({user} and {level} placeholders)')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('levelnotifs')
            .setDescription('Enable or disable level-up notifications')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('auditlog')
        .setDescription('Set audit log channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel for audit logs')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('starboard')
        .setDescription('Configure starboard settings')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Starboard channel (leave empty to disable)')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('threshold')
            .setDescription('Number of stars needed (default: 3)')
            .setMinValue(1)
            .setMaxValue(50)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('antiraid')
        .setDescription('Configure anti-raid protection')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable anti-raid protection')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('threshold')
            .setDescription('Number of joins to trigger protection (default: 5)')
            .setMinValue(3)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('window')
            .setDescription('Time window in seconds (default: 10)')
            .setMinValue(5)
            .setMaxValue(60)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to take when triggered (default: kick)')
            .addChoices(
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('warnings')
        .setDescription('Configure warning threshold auto-actions')
        .addBooleanOption(option =>
          option
            .setName('enabled')
            .setDescription('Enable or disable warning thresholds')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('threshold')
            .setDescription('Number of warnings to trigger action (default: 3)')
            .setMinValue(2)
            .setMaxValue(10)
            .setRequired(false)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to take when threshold reached (default: mute)')
            .addChoices(
              { name: 'Mute', value: 'mute' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Mute duration in minutes (default: 60, only for mute action)')
            .setMinValue(1)
            .setMaxValue(10080)
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('slowmode')
        .setDescription('Set slowmode for a channel')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Channel to set slowmode for')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Slowmode duration in seconds (0 to disable)')
            .setMinValue(0)
            .setMaxValue(21600)
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('logging')
        .setDescription('Configure server logging')
        .addChannelOption(option =>
          option
            .setName('channel')
            .setDescription('Log channel (leave empty to view current settings)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('message_edits')
            .setDescription('Log message edits')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('message_deletes')
            .setDescription('Log message deletions')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('member_join')
            .setDescription('Log member joins')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('member_leave')
            .setDescription('Log member leaves')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('role_changes')
            .setDescription('Log role changes')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('voice_activity')
            .setDescription('Log voice activity')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('channel_events')
            .setDescription('Log channel create/delete/update')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('server_events')
            .setDescription('Log server settings changes')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('role_events')
            .setDescription('Log role create/delete')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('ban_events')
            .setDescription('Log bans and unbans')
            .setRequired(false)
        )
        .addBooleanOption(option =>
          option
            .setName('invite_events')
            .setDescription('Log invite tracking')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('view')
        .setDescription('View current server configuration')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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
    const subcommand = interaction.options.getSubcommand();

    db.createGuild(interaction.guild.id);

    if (subcommand === 'xp') {
      const enabled = interaction.options.getBoolean('enabled');
      const min = interaction.options.getInteger('min');
      const max = interaction.options.getInteger('max');
      const cooldown = interaction.options.getInteger('cooldown');
      const levelChannel = interaction.options.getChannel('levelchannel');
      const levelMessage = interaction.options.getString('levelmessage');
      const levelNotifs = interaction.options.getBoolean('levelnotifs');

      const guildData = db.getGuild(interaction.guild.id) as any;
      const currentMin = min ?? guildData?.xp_min ?? 15;
      const currentMax = max ?? guildData?.xp_max ?? 25;

      if (currentMin >= currentMax) {
        await interaction.reply({
          content: t('common.errors.failed', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const updates: Record<string, any> = {};

      if (enabled !== null) updates.xp_enabled = enabled ? 1 : 0;
      if (min !== null) updates.xp_min = min;
      if (max !== null) updates.xp_max = max;
      if (cooldown !== null) updates.xp_cooldown = cooldown;
      if (levelChannel) updates.level_up_channel_id = levelChannel.id;
      if (levelMessage) updates.level_up_message = levelMessage;
      if (levelNotifs !== null) updates.level_up_enabled = levelNotifs ? 1 : 0;

      if (Object.keys(updates).length > 0) {
        db.updateGuild(interaction.guild.id, updates);
      }

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'auditlog') {
      const channel = interaction.options.getChannel('channel', true);

      db.updateGuild(interaction.guild.id, { audit_log_channel_id: channel.id });

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'starboard') {
      const channel = interaction.options.getChannel('channel');
      const threshold = interaction.options.getInteger('threshold');

      if (!channel) {
        db.updateGuild(interaction.guild.id, { starboard_channel_id: null });
        await interaction.reply({
          content: t('common.success', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      db.updateGuild(interaction.guild.id, {
        starboard_channel_id: channel.id,
        ...(threshold && { starboard_threshold: threshold })
      });

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'antiraid') {
      const enabled = interaction.options.getBoolean('enabled');
      const threshold = interaction.options.getInteger('threshold');
      const window = interaction.options.getInteger('window');
      const action = interaction.options.getString('action');

      const updates: Record<string, any> = {};

      if (enabled !== null) updates.antiraid_enabled = enabled ? 1 : 0;
      if (threshold !== null) updates.antiraid_join_threshold = threshold;
      if (window !== null) updates.antiraid_join_window = window;
      if (action !== null) updates.antiraid_action = action;

      if (Object.keys(updates).length > 0) {
        db.updateGuild(interaction.guild.id, updates);
      }

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'warnings') {
      const enabled = interaction.options.getBoolean('enabled');
      const threshold = interaction.options.getInteger('threshold');
      const action = interaction.options.getString('action');
      const duration = interaction.options.getInteger('duration');

      const updates: Record<string, any> = {};

      if (enabled !== null) updates.warning_threshold_enabled = enabled ? 1 : 0;
      if (threshold !== null) updates.warning_threshold_count = threshold;
      if (action !== null) updates.warning_threshold_action = action;
      if (duration !== null) updates.warning_threshold_duration = duration * 60;

      if (Object.keys(updates).length > 0) {
        db.updateGuild(interaction.guild.id, updates);
      }

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'slowmode') {
      const channel = interaction.options.getChannel('channel', true) as TextChannel;
      const duration = interaction.options.getInteger('duration', true);

      if (channel.type !== ChannelType.GuildText) {
        await interaction.reply({
          content: t('common.errors.failed', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      try {
        await channel.setRateLimitPerUser(duration);
        await interaction.reply({
          content: t('common.success', locale),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        await interaction.reply({
          content: t('common.errors.bot_no_permission', locale),
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    if (subcommand === 'view') {
      const guildData = db.getGuild(interaction.guild.id) as any;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.config.view_title', locale))
        .setDescription(t('commands.config.view_description', locale, { server: interaction.guild.name }))
        .addFields(
          {
            name: t('commands.config.welcome_messages', locale),
            value: t('commands.config.enabled', locale) + `: ${guildData.welcome_enabled ? '✅' : '❌'}\n` +
                   t('commands.config.channel', locale) + `: ${guildData.welcome_channel_id ? `<#${guildData.welcome_channel_id}>` : t('commands.config.not_set', locale)}\n` +
                   t('commands.config.message', locale) + `: ${guildData.welcome_message || t('commands.config.default', locale)}`,
            inline: false
          },
          {
            name: t('commands.config.goodbye_messages', locale),
            value: t('commands.config.enabled', locale) + `: ${guildData.goodbye_enabled ? '✅' : '❌'}\n` +
                   t('commands.config.channel', locale) + `: ${guildData.goodbye_channel_id ? `<#${guildData.goodbye_channel_id}>` : t('commands.config.not_set', locale)}\n` +
                   t('commands.config.message', locale) + `: ${guildData.goodbye_message || t('commands.config.default', locale)}`,
            inline: false
          },
          {
            name: t('commands.config.auto_role', locale),
            value: guildData.auto_role_id ? `<@&${guildData.auto_role_id}>` : t('commands.config.not_set', locale),
            inline: true
          },
          {
            name: t('commands.config.mod_log', locale),
            value: guildData.mod_log_channel_id ? `<#${guildData.mod_log_channel_id}>` : t('commands.config.not_set', locale),
            inline: true
          },
          {
            name: t('commands.config.xp_system', locale),
            value: t('commands.config.enabled', locale) + `: ${guildData.xp_enabled ? '✅' : '❌'}\n` +
                   t('commands.config.xp_range', locale) + `: ${guildData.xp_min || 15}-${guildData.xp_max || 25}\n` +
                   t('commands.config.cooldown', locale) + `: ${guildData.xp_cooldown || 60}s\n` +
                   t('commands.config.level_notifications', locale) + `: ${guildData.level_up_enabled ? '✅' : '❌'}`,
            inline: false
          }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (subcommand === 'welcome') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const enabled = interaction.options.getBoolean('enabled');

      const updates: Record<string, any> = {};

      if (channel) updates.welcome_channel_id = channel.id;
      if (message) updates.welcome_message = message;
      if (enabled !== null) updates.welcome_enabled = enabled ? 1 : 0;

      if (Object.keys(updates).length > 0) {
        db.updateGuild(interaction.guild.id, updates);
      }

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'goodbye') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');
      const enabled = interaction.options.getBoolean('enabled');

      const updates: Record<string, any> = {};

      if (channel) updates.goodbye_channel_id = channel.id;
      if (message) updates.goodbye_message = message;
      if (enabled !== null) updates.goodbye_enabled = enabled ? 1 : 0;

      if (Object.keys(updates).length > 0) {
        db.updateGuild(interaction.guild.id, updates);
      }

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'modlog') {
      const channel = interaction.options.getChannel('channel', true);

      db.updateGuild(interaction.guild.id, { mod_log_channel_id: channel.id });

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'logging') {
      const channel = interaction.options.getChannel('channel');
      const messageEdits = interaction.options.getBoolean('message_edits');
      const messageDeletes = interaction.options.getBoolean('message_deletes');
      const memberJoin = interaction.options.getBoolean('member_join');
      const memberLeave = interaction.options.getBoolean('member_leave');
      const roleChanges = interaction.options.getBoolean('role_changes');
      const voiceActivity = interaction.options.getBoolean('voice_activity');
      const channelEvents = interaction.options.getBoolean('channel_events');
      const serverEvents = interaction.options.getBoolean('server_events');
      const roleEvents = interaction.options.getBoolean('role_events');
      const banEvents = interaction.options.getBoolean('ban_events');
      const inviteEvents = interaction.options.getBoolean('invite_events');

      const guildData = db.getGuild(interaction.guild.id) as any;

      if (!channel && messageEdits === null && messageDeletes === null &&
          memberJoin === null && memberLeave === null && roleChanges === null &&
          voiceActivity === null && channelEvents === null && serverEvents === null &&
          roleEvents === null && banEvents === null && inviteEvents === null) {
        const currentChannel = guildData?.log_channel_id
          ? `<#${guildData.log_channel_id}>`
          : t('commands.config.not_set', locale);

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.config.logging_title', locale))
          .addFields(
            { name: t('commands.config.log_channel', locale), value: currentChannel, inline: false },
            { name: t('commands.config.message_edits', locale), value: guildData?.log_message_edits ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.message_deletes', locale), value: guildData?.log_message_deletes ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.member_joins', locale), value: guildData?.log_member_join ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.member_leaves', locale), value: guildData?.log_member_leave ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.role_changes', locale), value: guildData?.log_role_changes ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.voice_activity', locale), value: guildData?.log_voice_activity ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.channel_events', locale), value: guildData?.log_channel_events ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.server_events', locale), value: guildData?.log_server_events ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.role_events', locale), value: guildData?.log_role_events ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.ban_events', locale), value: guildData?.log_ban_events ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true },
            { name: t('commands.config.invite_tracking', locale), value: guildData?.log_invite_events ? t('commands.config.enabled_status', locale) : t('commands.config.disabled_status', locale), inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      const updates: Record<string, any> = {};

      if (channel) updates.log_channel_id = channel.id;
      if (messageEdits !== null) updates.log_message_edits = messageEdits ? 1 : 0;
      if (messageDeletes !== null) updates.log_message_deletes = messageDeletes ? 1 : 0;
      if (memberJoin !== null) updates.log_member_join = memberJoin ? 1 : 0;
      if (memberLeave !== null) updates.log_member_leave = memberLeave ? 1 : 0;
      if (roleChanges !== null) updates.log_role_changes = roleChanges ? 1 : 0;
      if (voiceActivity !== null) updates.log_voice_activity = voiceActivity ? 1 : 0;
      if (channelEvents !== null) updates.log_channel_events = channelEvents ? 1 : 0;
      if (serverEvents !== null) updates.log_server_events = serverEvents ? 1 : 0;
      if (roleEvents !== null) updates.log_role_events = roleEvents ? 1 : 0;
      if (banEvents !== null) updates.log_ban_events = banEvents ? 1 : 0;
      if (inviteEvents !== null) updates.log_invite_events = inviteEvents ? 1 : 0;

      if (Object.keys(updates).length > 0) {
        db.updateGuild(interaction.guild.id, updates);
      }

      await interaction.reply({
        content: t('common.success', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (subcommand === 'autorole') {
      const role = interaction.options.getRole('role');

      if (role) {
        db.updateGuild(interaction.guild.id, { auto_role_id: role.id });
        await interaction.reply({
          content: t('common.success', locale),
          flags: MessageFlags.Ephemeral
        });
      } else {
        db.updateGuild(interaction.guild.id, { auto_role_id: null });
        await interaction.reply({
          content: t('common.success', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    }
  }
};

export default command;
