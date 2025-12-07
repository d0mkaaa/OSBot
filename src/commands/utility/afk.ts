import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js';
import { Command } from '../../types/index.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const afkUsers = new Map<string, { reason: string; since: number }>();

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Set yourself as AFK')
    .addStringOption(option =>
      option
        .setName('reason')
        .setDescription('Reason for being AFK')
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    const reason = interaction.options.getString('reason') || t('commands.afk.no_reason', locale);

    afkUsers.set(interaction.user.id, {
      reason,
      since: Date.now()
    });

    await interaction.reply({
      content: t('commands.afk.success', locale, { reason }),
      flags: MessageFlags.Ephemeral
    });
  }
};

export default command;
export { afkUsers };
