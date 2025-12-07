import { Events, MessageReaction, User, PartialMessageReaction, PartialUser } from 'discord.js';
import { BotEvent } from '../types/index.js';
import { DatabaseManager } from '../database/Database.js';
import { logger } from '../utils/logger.js';
import { starboardManager } from '../utils/starboard.js';

const event: BotEvent = {
  name: Events.MessageReactionAdd,

  async execute(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
    if (user.bot) return;

    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        logger.error('Failed to fetch reaction', error);
        return;
      }
    }

    if (!reaction.message.guild) return;

    await starboardManager.handleReaction(reaction, user, true);

    const db = DatabaseManager.getInstance();
    const emoji = reaction.emoji.toString();

    const reactionRole = db.getReactionRole(reaction.message.id, emoji) as any;

    if (!reactionRole) return;

    try {
      const member = await reaction.message.guild.members.fetch(user.id);
      const role = await reaction.message.guild.roles.fetch(reactionRole.role_id);

      if (!role) {
        logger.warn(`Reaction role ${reactionRole.id} has invalid role ${reactionRole.role_id}`);
        return;
      }

      await member.roles.add(role);
      logger.info(`Added role ${role.name} to ${user.tag} via reaction role`);
    } catch (error) {
      logger.error('Failed to add role via reaction', error);
    }
  }
};

export default event;
