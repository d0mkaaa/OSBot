import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, TextChannel, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { auditLogger } from '../../utils/audit-logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Deletes a specified number of messages with optional filters')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    )
    .addUserOption(option =>
      option
        .setName('user')
        .setDescription('Only delete messages from this user')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('bots')
        .setDescription('Only delete messages from bots')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('embeds')
        .setDescription('Only delete messages with embeds')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('attachments')
        .setDescription('Only delete messages with attachments')
        .setRequired(false)
    )
    .addStringOption(option =>
      option
        .setName('contains')
        .setDescription('Only delete messages containing this text')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const amount = interaction.options.getInteger('amount', true);
    const filterUser = interaction.options.getUser('user');
    const filterBots = interaction.options.getBoolean('bots');
    const filterEmbeds = interaction.options.getBoolean('embeds');
    const filterAttachments = interaction.options.getBoolean('attachments');
    const filterContains = interaction.options.getString('contains');

    if (!interaction.guild) {
      await interaction.reply({
        content: t('common.errors.guild_only', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const channel = interaction.channel as TextChannel;

    if (!channel) {
      await interaction.reply({
        content: t('common.errors.channel_not_found', locale),
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const fetchLimit = Math.min(amount * 2, 100);
      const messages = await channel.messages.fetch({ limit: fetchLimit });

      let filtered = Array.from(messages.values());

      if (filterUser) {
        filtered = filtered.filter(msg => msg.author.id === filterUser.id);
      }

      if (filterBots) {
        filtered = filtered.filter(msg => msg.author.bot);
      }

      if (filterEmbeds) {
        filtered = filtered.filter(msg => msg.embeds.length > 0);
      }

      if (filterAttachments) {
        filtered = filtered.filter(msg => msg.attachments.size > 0);
      }

      if (filterContains) {
        filtered = filtered.filter(msg =>
          msg.content.toLowerCase().includes(filterContains.toLowerCase())
        );
      }

      const toDelete = filtered.slice(0, amount);

      if (toDelete.length === 0) {
        await interaction.editReply(t('commands.clear.no_messages', locale));
        return;
      }

      const deleted = await channel.bulkDelete(toDelete, true);

      const plural = deleted.size === 1 ? '' : 's';
      await interaction.editReply(
        t('commands.clear.success', locale, { count: deleted.size.toString(), plural })
      );

      const auditDetails: Record<string, any> = { count: deleted.size.toString(), channel: channel.name };
      if (filterUser) auditDetails.user = filterUser.tag;
      if (filterBots) auditDetails.filter = 'bots only';
      if (filterEmbeds) auditDetails.embeds = 'yes';
      if (filterAttachments) auditDetails.attachments = 'yes';
      if (filterContains) auditDetails.contains = filterContains;

      await auditLogger.log({
        guild: interaction.guild,
        action: 'MESSAGE_BULK_DELETE',
        moderator: interaction.user,
        reason: `Bulk message deletion in #${channel.name}`,
        details: auditDetails
      });
    } catch (error) {
      await interaction.editReply(t('commands.clear.failed', locale));
    }
  }
};

export default command;
