import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { PROFANITY_PRESETS, type ProfanityPreset } from '../../utils/profanity-list.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure auto-moderation settings')
    .addSubcommand(sub =>
      sub
        .setName('spam')
        .setDescription('Configure spam detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable spam detection').setRequired(true))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Messages before action (default: 5)').setMinValue(3).setMaxValue(10))
        .addIntegerOption(opt => opt.setName('interval').setDescription('Time window in seconds (default: 5)').setMinValue(3).setMaxValue(30))
    )
    .addSubcommand(sub =>
      sub
        .setName('links')
        .setDescription('Configure link filtering')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable link filtering').setRequired(true))
        .addStringOption(opt => opt.setName('whitelist').setDescription('Comma-separated whitelisted domains'))
    )
    .addSubcommand(sub =>
      sub
        .setName('caps')
        .setDescription('Configure caps detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable caps detection').setRequired(true))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Caps percentage (default: 70)').setMinValue(50).setMaxValue(100))
        .addIntegerOption(opt => opt.setName('min_length').setDescription('Minimum message length to check (default: 10)').setMinValue(5).setMaxValue(100))
    )
    .addSubcommand(sub =>
      sub
        .setName('mentions')
        .setDescription('Configure mass mention detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable mention detection').setRequired(true))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Max mentions (default: 5)').setMinValue(3).setMaxValue(20))
    )
    .addSubcommand(sub =>
      sub
        .setName('profanity')
        .setDescription('Configure profanity filter')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable profanity filter').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('preset')
            .setDescription('Use a predefined word list')
            .addChoices(
              { name: 'Strict (blocks most profanity)', value: 'strict' },
              { name: 'Moderate (blocks common profanity + slurs)', value: 'moderate' },
              { name: 'Slurs Only (blocks slurs and hate speech)', value: 'slurs_only' },
              { name: 'Custom (use custom word list)', value: 'custom' },
              { name: 'Off (clear word list)', value: 'off' }
            )
        )
        .addStringOption(opt => opt.setName('custom_words').setDescription('Custom comma-separated banned words (if preset=custom)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('invites')
        .setDescription('Configure Discord invite filtering')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable invite filtering').setRequired(true))
        .addBooleanOption(opt => opt.setName('allow_own').setDescription('Allow this server\'s own invites'))
        .addStringOption(opt => opt.setName('allowed_servers').setDescription('Comma-separated server IDs to allow invites from'))
    )
    .addSubcommand(sub =>
      sub
        .setName('action')
        .setDescription('Set the action for violations')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Action type')
            .setRequired(true)
            .addChoices(
              { name: 'Delete Message Only', value: 'delete' },
              { name: 'Warn User', value: 'warn' },
              { name: 'Timeout (5 min)', value: 'timeout' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('threshold')
        .setDescription('Configure progressive punishment (escalate after repeated violations)')
        .addIntegerOption(opt =>
          opt
            .setName('violations')
            .setDescription('Number of violations in 1 hour before escalating (0 = disabled)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(10)
        )
        .addStringOption(opt =>
          opt
            .setName('escalate_to')
            .setDescription('Action to take when threshold is reached')
            .addChoices(
              { name: 'Warn', value: 'warn' },
              { name: 'Timeout', value: 'timeout' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
        .addIntegerOption(opt =>
          opt
            .setName('duration')
            .setDescription('Timeout duration in minutes (for timeout action)')
            .setMinValue(1)
            .setMaxValue(10080)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View current auto-mod settings')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

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

    if (subcommand === 'status') {
      const settings = db.getAutomodSettings(interaction.guildId) as any;

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.automod.status_title', locale))
        .setDescription(settings ? t('commands.automod.status_description', locale) : t('commands.automod.status_not_configured', locale))
        .addFields(
          {
            name: t('commands.automod.spam_detection', locale),
            value: settings?.spam_enabled
              ? t('commands.automod.spam_enabled', locale, { threshold: settings.spam_threshold.toString(), interval: settings.spam_interval.toString() })
              : t('commands.automod.spam_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.link_filtering', locale),
            value: settings?.links_enabled
              ? t('commands.automod.link_enabled', locale, { whitelist: settings.links_whitelist || t('commands.automod.link_whitelist_none', locale) })
              : t('commands.automod.link_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.caps_detection', locale),
            value: settings?.caps_enabled
              ? t('commands.automod.caps_enabled', locale, { threshold: settings.caps_threshold.toString() })
              : t('commands.automod.caps_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.mass_mentions', locale),
            value: settings?.mentions_enabled
              ? t('commands.automod.mentions_enabled', locale, { threshold: settings.mentions_threshold.toString() })
              : t('commands.automod.mentions_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.profanity_filter', locale),
            value: settings?.profanity_enabled
              ? t('commands.automod.profanity_enabled', locale, { count: (settings.profanity_list?.split(',').length || 0).toString() })
              : t('commands.automod.profanity_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.invite_filtering', locale),
            value: settings?.invites_enabled
              ? (settings.invites_allow_own ? t('commands.automod.invites_enabled_own', locale) : t('commands.automod.invites_enabled', locale))
              : t('commands.automod.invites_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.action', locale),
            value: settings?.action ? `**${settings.action}**` : 'warn',
            inline: true
          },
          {
            name: t('commands.automod.progressive_punishment', locale),
            value: settings?.violations_threshold && settings.violations_threshold > 0
              ? t('commands.automod.progressive_enabled', locale, {
                  violations: settings.violations_threshold.toString(),
                  action: settings.violations_action || 'timeout',
                  duration: settings.violations_action === 'timeout' ? t('commands.automod.progressive_timeout_duration', locale, { minutes: Math.floor(settings.violations_duration / 60 || 5).toString() }) : ''
                })
              : t('commands.automod.progressive_disabled', locale),
            inline: true
          }
        )
        .setFooter({ text: t('commands.automod.status_footer', locale) });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const settings: Record<string, any> = {};
    const guildConfig: Record<string, any> = {};

    if (subcommand === 'spam') {
      settings.spam_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const threshold = interaction.options.getInteger('threshold');
      const interval = interaction.options.getInteger('interval');

      if (threshold) {
        settings.spam_threshold = threshold;
        guildConfig.automod_spam_count = threshold;
      }
      if (interval) {
        settings.spam_interval = interval;
        guildConfig.automod_spam_interval = interval;
      }
    } else if (subcommand === 'links') {
      settings.links_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const whitelist = interaction.options.getString('whitelist');
      if (whitelist) {
        settings.links_whitelist = whitelist;
        guildConfig.automod_allowed_links = whitelist;
      }
    } else if (subcommand === 'caps') {
      settings.caps_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const threshold = interaction.options.getInteger('threshold');
      const minLength = interaction.options.getInteger('min_length');

      if (threshold) {
        settings.caps_threshold = threshold;
        guildConfig.automod_caps_percentage = threshold;
      }
      if (minLength) {
        guildConfig.automod_caps_min_length = minLength;
      }
    } else if (subcommand === 'mentions') {
      settings.mentions_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const threshold = interaction.options.getInteger('threshold');
      if (threshold) {
        settings.mentions_threshold = threshold;
        guildConfig.automod_max_mentions = threshold;
      }
    } else if (subcommand === 'profanity') {
      settings.profanity_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const preset = interaction.options.getString('preset');
      const customWords = interaction.options.getString('custom_words');

      if (preset) {
        if (preset === 'custom' || preset === 'off') {
          guildConfig.automod_profanity_preset = preset;
          if (preset === 'off') {
            settings.profanity_list = '';
          }
        } else if (preset in PROFANITY_PRESETS) {
          guildConfig.automod_profanity_preset = preset;
          settings.profanity_list = PROFANITY_PRESETS[preset as ProfanityPreset];
        }
      }

      if (customWords) {
        guildConfig.automod_profanity_list = customWords.replace(/,/g, '\n');
        settings.profanity_list = customWords;
      }
    } else if (subcommand === 'invites') {
      settings.invites_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const allowOwn = interaction.options.getBoolean('allow_own');
      const allowedServers = interaction.options.getString('allowed_servers');

      if (allowOwn !== null) {
        settings.invites_allow_own = allowOwn ? 1 : 0;
      }
      if (allowedServers) {
        guildConfig.automod_allow_invites_list = allowedServers.replace(/,/g, '\n');
      }
    } else if (subcommand === 'action') {
      settings.action = interaction.options.getString('type', true);
    } else if (subcommand === 'threshold') {
      const violations = interaction.options.getInteger('violations', true);
      settings.violations_threshold = violations;

      if (violations > 0) {
        const escalateTo = interaction.options.getString('escalate_to');
        const duration = interaction.options.getInteger('duration');

        if (escalateTo) {
          settings.violations_action = escalateTo;
        }
        if (duration) {
          settings.violations_duration = duration * 60;
        }
      }
    }

    try {
      db.updateAutomodSettings(interaction.guildId, settings);

      if (Object.keys(guildConfig).length > 0) {
        db.updateGuild(interaction.guildId, guildConfig);
      }

      await interaction.reply({
        content: t('commands.automod.updated', locale, { subcommand }),
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      logger.error('Failed to update automod settings:', error);
      await interaction.reply({
        content: t('commands.automod.update_failed', locale),
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

export default command;
