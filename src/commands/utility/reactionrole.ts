import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags, EmbedBuilder } from 'discord.js';
import { Command } from '../../types/index.js';
import { DatabaseManager } from '../../database/Database.js';
import { logger } from '../../utils/logger.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('reactionrole')
    .setDescription('Manage reaction roles')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a reaction role to a message')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji to react with').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a reaction role from a message')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
        .addStringOption(opt => opt.setName('emoji').setDescription('Emoji').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all reaction roles for a message')
        .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Create a reaction role panel')
        .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description'))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

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
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'create') {
      const title = interaction.options.getString('title', true);
      const description = interaction.options.getString('description') || t('commands.reactionrole.default_description', locale);

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: t('commands.reactionrole.footer', locale) });

      if (!interaction.channel || !('send' in interaction.channel)) {
        await interaction.reply({
          content: t('commands.reactionrole.invalid_channel', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const message = await interaction.channel.send({ embeds: [embed] });

      await interaction.reply({
        content: t('commands.reactionrole.panel_created', locale, { id: message.id }),
        flags: MessageFlags.Ephemeral
      });
    } else if (subcommand === 'add') {
      const messageId = interaction.options.getString('message_id', true);
      const emoji = interaction.options.getString('emoji', true);
      const role = interaction.options.getRole('role', true);

      try {
        const message = await interaction.channel!.messages.fetch(messageId);

        const botMember = await interaction.guild.members.fetchMe();
        if (role.position >= botMember.roles.highest.position) {
          await interaction.reply({
            content: t('commands.reactionrole.role_too_high', locale),
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        await message.react(emoji);

        db.createReactionRole(interaction.guildId, messageId, interaction.channelId, emoji, role.id);

        await interaction.reply({
          content: t('commands.reactionrole.added', locale, { emoji, role: `${role}` }),
          flags: MessageFlags.Ephemeral
        });
      } catch (error: any) {
        logger.error('Failed to add reaction role:', error);
        let errorMsg = t('commands.reactionrole.add_failed', locale);

        if (error.code === 10008) {
          errorMsg = t('commands.reactionrole.message_not_found', locale);
        } else if (error.message?.includes('Unknown Emoji')) {
          errorMsg = t('commands.reactionrole.invalid_emoji', locale);
        }

        await interaction.reply({
          content: errorMsg,
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'remove') {
      const messageId = interaction.options.getString('message_id', true);
      const emoji = interaction.options.getString('emoji', true);

      try {
        const message = await interaction.channel!.messages.fetch(messageId);

        const reaction = message.reactions.cache.find(r => r.emoji.toString() === emoji);
        if (reaction) {
          await reaction.users.remove(interaction.client.user!.id);
        }

        db.deleteReactionRole(messageId, emoji);

        await interaction.reply({
          content: t('commands.reactionrole.removed', locale),
          flags: MessageFlags.Ephemeral
        });
      } catch (error) {
        logger.error('Failed to remove reaction role:', error);
        await interaction.reply({
          content: t('commands.reactionrole.remove_failed', locale),
          flags: MessageFlags.Ephemeral
        });
      }
    } else if (subcommand === 'list') {
      const messageId = interaction.options.getString('message_id', true);

      const reactionRoles = db.getReactionRolesByMessage(messageId) as any[];

      if (reactionRoles.length === 0) {
        await interaction.reply({
          content: t('commands.reactionrole.no_roles', locale),
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(t('commands.reactionrole.list_title', locale))
        .setDescription(t('commands.reactionrole.list_description', locale, { id: messageId }))
        .addFields(
          reactionRoles.map(rr => ({
            name: rr.emoji,
            value: `<@&${rr.role_id}>`,
            inline: true
          }))
        );

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};

export default command;
