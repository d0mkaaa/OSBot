import { ChatInputCommandInteraction } from 'discord.js';
import { DatabaseManager } from '../database/Database.js';

export function getInteractionLocale(interaction: ChatInputCommandInteraction): string {
  if (!interaction.guildId) {
    return interaction.locale || 'en';
  }

  const db = DatabaseManager.getInstance();
  const guild = db.getGuild(interaction.guildId) as any;

  return guild?.locale || interaction.locale || 'en';
}
