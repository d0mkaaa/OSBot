export const COMMAND_CATEGORIES = {
  information: {
    name: '📊 Information',
    emoji: '📊',
    description: 'Commands to get information about users, servers, and the bot',
    commands: ['ping', 'help', 'serverinfo', 'userinfo', 'avatar', 'botinfo', 'invite', 'rank', 'leaderboard'] as readonly string[]
  },
  moderation: {
    name: '🛡️ Moderation',
    emoji: '🛡️',
    description: 'Commands for server moderation and management',
    commands: ['kick', 'ban', 'unban', 'tempban', 'softban', 'mute', 'unmute', 'clear', 'role', 'warn', 'automod', 'auditlog', 'massrole', 'nickname', 'lockdown', 'voice', 'case'] as readonly string[]
  },
  configuration: {
    name: '⚙️ Configuration',
    emoji: '⚙️',
    description: 'Commands to configure the bot for your server',
    commands: ['config', 'rules', 'levelroles', 'tag'] as readonly string[]
  },
  utility: {
    name: '🎨 Utility',
    emoji: '🎨',
    description: 'Useful utility commands for server management',
    commands: ['poll', 'embed', 'say', 'giveaway', 'remind', 'afk', 'reactionrole', 'ticket', 'snipe'] as readonly string[]
  },
  fun: {
    name: '🎮 Fun',
    emoji: '🎮',
    description: 'Fun and entertainment commands',
    commands: ['roll', 'coinflip', 'choose', '8ball'] as readonly string[]
  }
} as const;

export type CategoryKey = keyof typeof COMMAND_CATEGORIES;

export function getCategoryForCommand(commandName: string): CategoryKey | null {
  for (const [key, category] of Object.entries(COMMAND_CATEGORIES)) {
    if ((category.commands as readonly string[]).includes(commandName)) {
      return key as CategoryKey;
    }
  }
  return null;
}
