import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { HealthMonitor } from '../../utils/health-monitor.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
import { env } from '../../config/environment.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('health')
    .setDescription('View bot health status and metrics')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);

    const botOwners = env.botOwners.split(',').map(id => id.trim());
    if (!botOwners.includes(interaction.user.id)) {
      await interaction.reply({
        content: t('commands.health.owner_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const healthMonitor = HealthMonitor.getInstance();
    const metrics = await healthMonitor.checkHealth();

    const statusEmoji = {
      healthy: '🟢',
      degraded: '🟡',
      unhealthy: '🔴'
    }[metrics.status];

    const statusColor = {
      healthy: 0x00ff00,
      degraded: 0xffff00,
      unhealthy: 0xff0000
    }[metrics.status];

    const embed = new EmbedBuilder()
      .setColor(statusColor)
      .setTitle(t('commands.health.title', locale, { emoji: statusEmoji, status: metrics.status.toUpperCase() }))
      .addFields(
        {
          name: t('commands.health.uptime', locale),
          value: formatUptime(metrics.uptime),
          inline: true
        },
        {
          name: t('commands.health.memory', locale),
          value: t('commands.health.memory_value', locale, {
            used: metrics.memory.used.toString(),
            total: metrics.memory.total.toString(),
            percentage: metrics.memory.percentage.toString()
          }),
          inline: true
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true
        },
        {
          name: t('commands.health.database', locale),
          value: metrics.database.connected
            ? t('commands.health.database_connected', locale, { time: metrics.database.responseTime.toString() })
            : t('commands.health.database_disconnected', locale),
          inline: true
        },
        {
          name: t('commands.health.discord', locale),
          value: metrics.discord.connected
            ? t('commands.health.discord_connected', locale, {
                ping: metrics.discord.ping.toString(),
                guilds: metrics.discord.guilds.toString()
              })
            : t('commands.health.discord_disconnected', locale),
          inline: true
        },
        {
          name: '\u200b',
          value: '\u200b',
          inline: true
        }
      )
      .setTimestamp(metrics.timestamp);

    if (metrics.errors.length > 0) {
      embed.addFields({
        name: t('commands.health.errors', locale),
        value: metrics.errors.map(e => `• ${e}`).join('\n'),
        inline: false
      });
    }

    const monitorStatus = healthMonitor.getStatus();
    embed.setFooter({
      text: t('commands.health.footer', locale, {
        enabled: monitorStatus.enabled ? t('common.enabled', locale) : t('common.disabled', locale)
      })
    });

    await interaction.editReply({ embeds: [embed] });
  }
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default command;
