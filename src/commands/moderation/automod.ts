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
        .addBooleanOption(opt => opt.setName('word_boundaries').setDescription('Use word boundaries (prevents false positives like "class")'))
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
        .setName('exempt')
        .setDescription('Manage exemptions from auto-moderation')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Type of exemption')
            .setRequired(true)
            .addChoices(
              { name: 'Roles', value: 'roles' },
              { name: 'Channels', value: 'channels' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
              { name: 'Clear All', value: 'clear' }
            )
        )
        .addStringOption(opt => opt.setName('id').setDescription('Role or Channel ID (for add/remove)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('View current auto-mod settings')
    )
    .addSubcommand(sub =>
      sub
        .setName('filter')
        .setDescription('Manage custom regex filters')
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Add', value: 'add' },
              { name: 'Remove', value: 'remove' },
              { name: 'List', value: 'list' },
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' }
            )
        )
        .addStringOption(opt => opt.setName('name').setDescription('Filter name'))
        .addStringOption(opt => opt.setName('pattern').setDescription('Regex pattern (for add)'))
        .addStringOption(opt =>
          opt
            .setName('filter_action')
            .setDescription('Action for this filter (for add)')
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
        .setName('similarity')
        .setDescription('Configure similar message spam detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable similarity detection').setRequired(true))
        .addIntegerOption(opt => opt.setName('threshold').setDescription('Similarity percentage (default: 80)').setMinValue(50).setMaxValue(100))
    )
    .addSubcommand(sub =>
      sub
        .setName('phishing')
        .setDescription('Configure phishing link detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable phishing detection').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action to take for phishing links')
            .addChoices(
              { name: 'Warn', value: 'warn' },
              { name: 'Timeout (5 min)', value: 'timeout' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('account-age')
        .setDescription('Configure minimum account age requirement')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable account age check').setRequired(true))
        .addIntegerOption(opt => opt.setName('min_days').setDescription('Minimum account age in days (default: 7)').setMinValue(1).setMaxValue(365))
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action to take for accounts below minimum age')
            .addChoices(
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('alt-detection')
        .setDescription('Configure suspicious alt account detection')
        .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable alt detection').setRequired(true))
        .addIntegerOption(opt =>
          opt
            .setName('sensitivity')
            .setDescription('Detection sensitivity (1=strict, 5=lenient, default: 3)')
            .setMinValue(1)
            .setMaxValue(5)
        )
        .addStringOption(opt =>
          opt
            .setName('action')
            .setDescription('Action for critical risk accounts')
            .addChoices(
              { name: 'Warn Only', value: 'warn' },
              { name: 'Kick', value: 'kick' },
              { name: 'Ban', value: 'ban' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('lockdown')
        .setDescription('Manually control server lockdown mode')
        .addStringOption(opt =>
          opt
            .setName('mode')
            .setDescription('Enable or disable lockdown')
            .setRequired(true)
            .addChoices(
              { name: 'Enable', value: 'enable' },
              { name: 'Disable', value: 'disable' },
              { name: 'Status', value: 'status' }
            )
        )
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
          },
          {
            name: t('commands.automod.phishing_detection', locale),
            value: settings?.phishing_enabled
              ? t('commands.automod.phishing_enabled', locale, { action: settings.phishing_action || 'warn' })
              : t('commands.automod.phishing_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.account_age_check', locale),
            value: settings?.account_age_enabled
              ? t('commands.automod.account_age_enabled', locale, { days: (settings.account_age_min_days || 7).toString(), action: settings.account_age_action || 'kick' })
              : t('commands.automod.account_age_disabled', locale),
            inline: true
          },
          {
            name: t('commands.automod.alt_detection', locale),
            value: settings?.alt_detection_enabled
              ? t('commands.automod.alt_detection_enabled', locale, { sensitivity: (settings.alt_detection_sensitivity || 3).toString(), action: settings.alt_detection_action || 'warn' })
              : t('commands.automod.alt_detection_disabled', locale),
            inline: true
          }
        );

      if (settings?.exempt_roles || settings?.exempt_channels) {
        const exemptRoles = settings.exempt_roles?.split(',').filter((r: string) => r.trim().length > 0) || [];
        const exemptChannels = settings.exempt_channels?.split(',').filter((c: string) => c.trim().length > 0) || [];

        if (exemptRoles.length > 0) {
          embed.addFields({
            name: t('commands.automod.exempt_roles', locale),
            value: exemptRoles.map((r: string) => `<@&${r.trim()}>`).join(', '),
            inline: false
          });
        }

        if (exemptChannels.length > 0) {
          embed.addFields({
            name: t('commands.automod.exempt_channels', locale),
            value: exemptChannels.map((c: string) => `<#${c.trim()}>`).join(', '),
            inline: false
          });
        }
      }

      embed.setFooter({ text: t('commands.automod.status_footer', locale) });

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
        settings.caps_min_length = minLength;
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
      const wordBoundaries = interaction.options.getBoolean('word_boundaries');

      if (preset) {
        if (preset === 'custom' || preset === 'off') {
          settings.profanity_preset = preset;
          guildConfig.automod_profanity_preset = preset;
          if (preset === 'off') {
            settings.profanity_list = '';
          }
        } else if (preset in PROFANITY_PRESETS) {
          settings.profanity_preset = preset;
          guildConfig.automod_profanity_preset = preset;
        }
      }

      if (customWords) {
        settings.profanity_list = customWords.replace(/,/g, '\n');
        guildConfig.automod_profanity_list = customWords.replace(/,/g, '\n');
      }

      if (wordBoundaries !== null) {
        settings.profanity_use_word_boundaries = wordBoundaries ? 1 : 0;
      }
    } else if (subcommand === 'invites') {
      settings.invites_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const allowOwn = interaction.options.getBoolean('allow_own');
      const allowedServers = interaction.options.getString('allowed_servers');

      if (allowOwn !== null) {
        settings.invites_allow_own = allowOwn ? 1 : 0;
      }
      if (allowedServers) {
        settings.invites_allowlist = allowedServers.replace(/,/g, '\n');
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
    } else if (subcommand === 'exempt') {
      const type = interaction.options.getString('type', true);
      const action = interaction.options.getString('action', true);
      const id = interaction.options.getString('id');

      const currentSettings = db.getAutomodSettings(interaction.guildId) as any;
      const field = type === 'roles' ? 'exempt_roles' : 'exempt_channels';
      const currentList = currentSettings?.[field] || '';
      const exemptList = currentList.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      if (action === 'add') {
        if (!id) {
          await interaction.reply({
            content: t('commands.automod.exempt_id_required', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        if (exemptList.includes(id)) {
          await interaction.reply({
            content: t('commands.automod.exempt_already_added', locale, { type }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        exemptList.push(id);
        settings[field] = exemptList.join(',');
        await interaction.reply({
          content: t('commands.automod.exempt_added', locale, { type, id }),
          flags: MessageFlags.Ephemeral
        });
      } else if (action === 'remove') {
        if (!id) {
          await interaction.reply({
            content: t('commands.automod.exempt_id_required', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        const index = exemptList.indexOf(id);
        if (index === -1) {
          await interaction.reply({
            content: t('commands.automod.exempt_not_found', locale, { type }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        exemptList.splice(index, 1);
        settings[field] = exemptList.join(',');
        await interaction.reply({
          content: t('commands.automod.exempt_removed', locale, { type, id }),
          flags: MessageFlags.Ephemeral
        });
      } else if (action === 'list') {
        if (exemptList.length === 0) {
          await interaction.reply({
            content: t('commands.automod.exempt_none', locale, { type }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }
        const listDisplay = type === 'roles'
          ? exemptList.map((roleId: string) => `<@&${roleId}>`).join('\n')
          : exemptList.map((channelId: string) => `<#${channelId}>`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.automod.exempt_list_title', locale, { type }))
          .setDescription(listDisplay);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      } else if (action === 'clear') {
        settings[field] = '';
        await interaction.reply({
          content: t('commands.automod.exempt_cleared', locale, { type }),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'filter') {
      const action = interaction.options.getString('action', true);
      const name = interaction.options.getString('name');
      const pattern = interaction.options.getString('pattern');
      const filterAction = interaction.options.getString('filter_action');

      if (action === 'add') {
        if (!name || !pattern || !filterAction) {
          await interaction.reply({
            content: t('commands.automod.filter_add_missing', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        try {
          new RegExp(pattern);
        } catch {
          await interaction.reply({
            content: t('commands.automod.filter_invalid_regex', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const existing = db.getCustomFilter(interaction.guildId, name);
        if (existing) {
          await interaction.reply({
            content: t('commands.automod.filter_exists', locale, { name }),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        try {
          db.addCustomFilter(interaction.guildId, name, pattern, filterAction, interaction.user.id);
          await interaction.reply({
            content: t('commands.automod.filter_added', locale, { name }),
            flags: MessageFlags.Ephemeral
          });
        } catch (error) {
          logger.error('Failed to add custom filter:', error);
          await interaction.reply({
            content: t('commands.automod.filter_add_failed', locale),
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      } else if (action === 'remove') {
        if (!name) {
          await interaction.reply({
            content: t('commands.automod.filter_name_required', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        try {
          db.deleteCustomFilter(interaction.guildId, name);
          await interaction.reply({
            content: t('commands.automod.filter_removed', locale, { name }),
            flags: MessageFlags.Ephemeral
          });
        } catch (error) {
          logger.error('Failed to remove custom filter:', error);
          await interaction.reply({
            content: t('commands.automod.filter_remove_failed', locale),
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      } else if (action === 'list') {
        const filters = db.getCustomFilters(interaction.guildId) as any[];

        if (filters.length === 0) {
          await interaction.reply({
            content: t('commands.automod.filter_none', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(t('commands.automod.filter_list_title', locale))
          .setDescription(
            filters.map((f: any) =>
              `**${f.name}** ${f.enabled ? '✅' : '❌'}\n` +
              `Pattern: \`${f.pattern}\`\n` +
              `Action: ${f.action}\n`
            ).join('\n')
          );

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      } else if (action === 'enable' || action === 'disable') {
        if (!name) {
          await interaction.reply({
            content: t('commands.automod.filter_name_required', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        try {
          db.updateCustomFilter(interaction.guildId, name, { enabled: action === 'enable' });
          await interaction.reply({
            content: t(action === 'enable' ? 'commands.automod.filter_enabled' : 'commands.automod.filter_disabled', locale, { name }),
            flags: MessageFlags.Ephemeral
          });
        } catch (error) {
          logger.error('Failed to update custom filter:', error);
          await interaction.reply({
            content: t('commands.automod.filter_update_failed', locale),
            flags: MessageFlags.Ephemeral
          });
        }
        return;
      }
    } else if (subcommand === 'similarity') {
      settings.spam_similarity_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const threshold = interaction.options.getInteger('threshold');
      if (threshold) {
        settings.spam_similarity_threshold = threshold;
      }
    } else if (subcommand === 'phishing') {
      settings.phishing_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const action = interaction.options.getString('action');
      if (action) {
        settings.phishing_action = action;
      }
    } else if (subcommand === 'account-age') {
      settings.account_age_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const minDays = interaction.options.getInteger('min_days');
      const action = interaction.options.getString('action');

      if (minDays) {
        settings.account_age_min_days = minDays;
      }
      if (action) {
        settings.account_age_action = action;
      }
    } else if (subcommand === 'alt-detection') {
      settings.alt_detection_enabled = interaction.options.getBoolean('enabled', true) ? 1 : 0;
      const sensitivity = interaction.options.getInteger('sensitivity');
      const action = interaction.options.getString('action');

      if (sensitivity) {
        settings.alt_detection_sensitivity = sensitivity;
      }
      if (action) {
        settings.alt_detection_action = action;
      }
    } else if (subcommand === 'lockdown') {
      const mode = interaction.options.getString('mode', true);

      if (mode === 'status') {
        const { antiRaidManager } = await import('../../utils/antiraid.js');
        const status = antiRaidManager.getLockdownStatus(interaction.guildId);

        const embed = new EmbedBuilder()
          .setColor(status.active ? 0xFF0000 : 0x00FF00)
          .setTitle(status.active ? '🔒 Lockdown Active' : '🔓 Lockdown Inactive')
          .setDescription(
            status.active
              ? `Server is currently in lockdown mode.\n\n` +
                `**Started:** <t:${status.startedAt}:R>\n` +
                `**Duration:** <t:${status.startedAt}:R>\n\n` +
                `Use \`/automod lockdown disable\` to deactivate.`
              : `Server is not in lockdown mode.\n\n` +
                `Use \`/automod lockdown enable\` to activate manually.`
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      const { antiRaidManager } = await import('../../utils/antiraid.js');

      if (mode === 'enable') {
        await antiRaidManager.activateLockdown(interaction.guild!);
        await interaction.reply({
          content: t('commands.automod.lockdown_enabled', locale),
          flags: MessageFlags.Ephemeral
        });
      } else if (mode === 'disable') {
        await antiRaidManager.deactivateLockdown(interaction.guild!);
        await interaction.reply({
          content: t('commands.automod.lockdown_disabled', locale),
          flags: MessageFlags.Ephemeral
        });
      }
      return;
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
