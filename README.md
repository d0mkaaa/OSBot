# OSBot - Modern Discord Bot

A feature-rich Discord bot built with TypeScript, discord.js v14, and Bun runtime. Packed with moderation tools, leveling systems, utility commands, and comprehensive logging capabilities.

## Features

### Moderation & Safety
- **Auto-Moderation** - Spam detection, profanity filter, link filtering, caps detection, mass mentions, Discord invite blocking
- **Moderation Commands** - Kick, ban, tempban, softban, unban, mute, unmute, warn, clear messages
- **Mass Operations** - Mass role assignment/removal with filters
- **Lockdown** - Temporarily lock channels
- **Voice Moderation** - Disconnect, move, mute, deafen users in voice channels
- **Progressive Punishment** - Automatic escalation for repeat offenders
- **Nickname Management** - Lock/unlock nicknames to prevent changes

### Leveling & Engagement
- **XP System** - Gain XP from messages with customizable cooldowns
- **Level Roles** - Auto-assign roles when users reach specific levels
- **Leaderboards** - Track top members by XP and level
- **Rank Cards** - View your current rank and progress

### Utility & Management
- **Ticket System** - Support ticket creation with transcript support
- **Giveaways** - Create, manage, reroll, and end giveaways
- **Polls** - Create polls with up to 10 options
- **Reaction Roles** - Self-assignable roles via reactions
- **Custom Tags** - Create and manage server-specific tags
- **Reminders** - Set reminders (1 min - 7 days)
- **AFK System** - Set AFK status with auto-responses
- **Embed Builder** - Create custom embeds
- **Say Command** - Make the bot send messages
- **Snipe** - View recently deleted messages
- **Starboard** - Highlight popular messages with reactions

### Information & Fun
- **Server Info** - Detailed server statistics
- **User Info** - View user profiles and join dates
- **Bot Info** - Bot statistics and uptime
- **Avatar** - View and download user avatars
- **8ball** - Ask the magic 8ball
- **Coin Flip** - Flip a coin
- **Dice Roll** - Roll dice with custom sides
- **Choose** - Pick random option from choices

### Configuration
- **Per-Guild Settings** - Welcome/goodbye messages, log channels, XP settings
- **Audit Logging** - Track all moderation actions
- **Event Logging** - Member joins/leaves, role updates, message edits/deletes, bans/unbans
- **Custom Rules** - Set and display server rules
- **Web Dashboard** - Optional browser-based management interface (see [DASHBOARD.md](DASHBOARD.md))

## Tech Stack

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **Language**: TypeScript 5.x
- **Framework**: discord.js v14
- **Database**: SQLite (bun:sqlite)

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed (v1.0+)
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- Basic understanding of Discord bot setup

### Installation

1. Clone the repository:
```bash
git clone https://github.com/d0mkaaa/OSBot.git
cd OSBot
```

2. Install dependencies:
```bash
bun install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Configure your `.env` file:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
```

5. Deploy slash commands:
```bash
bun run deploy
```

6. Start the bot:
```bash
bun run dev
```

For detailed setup instructions, see [SETUP.md](SETUP.md).

## Commands

For a complete list of commands with examples, see [COMMANDS.md](COMMANDS.md).

### Quick Command Reference

**Moderation** (Requires appropriate permissions)
- `/ban` - Ban a user
- `/kick` - Kick a user
- `/warn` - Warn a user
- `/mute` - Timeout a user
- `/unmute` - Remove timeout
- `/clear` - Bulk delete messages
- `/automod` - Configure auto-moderation
- `/lockdown` - Lock/unlock channels
- `/massrole` - Mass role operations
- `/voice` - Voice moderation

**Utility**
- `/ticket` - Ticket system management
- `/giveaway` - Giveaway management
- `/poll` - Create polls
- `/remind` - Set reminders
- `/afk` - Set AFK status
- `/embed` - Create embeds
- `/say` - Send messages as bot
- `/snipe` - View deleted messages

**Configuration** (Requires Manage Guild)
- `/config` - Configure bot settings
- `/levelroles` - Setup level roles
- `/reactionrole` - Setup reaction roles
- `/tag` - Manage custom tags
- `/rules` - Manage server rules

**Information**
- `/help` - Show all commands
- `/ping` - Check bot latency
- `/serverinfo` - Server information
- `/userinfo` - User information
- `/botinfo` - Bot statistics
- `/rank` - View your rank
- `/leaderboard` - XP leaderboard
- `/avatar` - View avatars

**Fun**
- `/8ball` - Ask the magic 8ball
- `/coinflip` - Flip a coin
- `/roll` - Roll dice
- `/choose` - Pick random option

## Configuration

For detailed configuration guide, see [CONFIGURATION.md](CONFIGURATION.md).

### Essential Setup

1. **Set Log Channels** - Configure where events are logged:
```
/config log_channel #logs
/config audit_log_channel #mod-logs
```

2. **Configure Auto-Moderation**:
```
/automod spam enabled:true threshold:5 interval:5
/automod profanity enabled:true preset:moderate
/automod action type:warn
```

3. **Set Welcome Messages**:
```
/config welcome_message Welcome {user} to {server}!
/config welcome_channel #welcome
```

4. **Configure XP System**:
```
/config xp_enabled enabled:true
/config xp_cooldown seconds:60
/levelroles add level:10 role:@Active Member
```

## Required Bot Permissions

For full functionality, the bot needs these Discord permissions:

**Essential Permissions:**
- `Manage Roles` - Auto-roles, level roles, reaction roles
- `Manage Messages` - Auto-moderation, message deletion, snipe
- `Kick Members` - Kick command and automod actions
- `Ban Members` - Ban commands
- `Moderate Members` - Timeout/mute commands
- `Manage Channels` - Ticket system, lockdown
- `Manage Nicknames` - Nickname management
- `Send Messages` - All bot responses
- `Embed Links` - Rich embeds
- `Add Reactions` - Polls, giveaways, reaction roles
- `Read Message History` - Message moderation, snipe

**Recommended Invite Link:**
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099780063318&scope=bot%20applications.commands
```

Replace `YOUR_CLIENT_ID` with your bot's client ID.

**Important Notes:**
- The bot's role must be positioned **higher** than roles it needs to manage
- The bot cannot moderate users with roles higher than its highest role
- Some features require specific channel permissions (e.g., ticket system needs channel creation)

## Project Structure

```
OSBot/
├── src/
│   ├── client/              # Discord client wrapper
│   ├── commands/            # Slash commands organized by category
│   │   ├── configuration/   # Config commands (config, levelroles, rules, tag)
│   │   ├── fun/             # Fun commands (8ball, coinflip, choose, roll)
│   │   ├── information/     # Info commands (help, ping, serverinfo, userinfo, etc.)
│   │   ├── moderation/      # Mod commands (ban, kick, warn, automod, etc.)
│   │   └── utility/         # Utility commands (ticket, giveaway, poll, etc.)
│   ├── config/              # Bot configuration
│   ├── database/            # Database manager and schema
│   ├── events/              # Discord event handlers
│   ├── handlers/            # Command and event loaders
│   ├── types/               # TypeScript type definitions
│   └── utils/               # Utility functions (logger, audit logger, etc.)
├── data/                    # SQLite database storage
├── .env                     # Environment variables (create from .env.example)
├── package.json             # Project metadata and scripts
└── tsconfig.json            # TypeScript configuration
```

## Development

### Available Scripts

```bash
# Development mode with hot reload
bun run dev

# Build for production
bun run build

# Run production build
bun run start

# Deploy slash commands
bun run deploy
```

### Database

The bot uses SQLite with the following tables:
- `guilds` - Guild-specific settings
- `users` - User data and XP
- `warnings` - Warning records
- `audit_logs` - Moderation action logs
- `tickets` - Support ticket data
- `reaction_roles` - Reaction role mappings
- `tags` - Custom server tags
- `reminders` - Scheduled reminders
- `afk_users` - AFK status tracking
- `giveaways` - Giveaway data
- `locked_nicknames` - Locked nickname tracking

Database is automatically created on first run using `schema.sql`.

## Security Features

- **Input Sanitization** - All user inputs are validated
- **SQL Injection Prevention** - Prepared statements used throughout
- **Rate Limiting** - 3-second cooldown per command per user
- **Permission System** - Role hierarchy respected
- **Auto-Moderation** - Configurable content filtering
- **Audit Logging** - All moderation actions tracked
- **Environment Variables** - Sensitive data secured

## Logging

The bot provides comprehensive logging:

### Event Logging
Configure with `/config log_channel`:
- Member joins/leaves
- Message edits/deletes
- Role updates
- Channel updates
- Guild updates
- Bans/unbans

### Audit Logging
Configure with `/config audit_log_channel`:
- All moderation actions
- Configuration changes
- Auto-moderation actions
- Custom command usage

### Console Logging
- Color-coded console output
- Timestamped entries
- Error tracking
- Command usage monitoring

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Troubleshooting

### Commands not showing up
- Run `bun run deploy` to register slash commands
- Ensure bot has `applications.commands` scope
- Check bot permissions in server settings

### Bot not responding
- Verify `DISCORD_TOKEN` in `.env`
- Check bot is online in Discord
- Review console logs for errors
- Ensure bot has necessary permissions

### Database errors
- Delete `data/bot.db` and restart (will reset all data)
- Check file permissions on `data/` directory
- Verify Bun SQLite support

### Permission errors
- Ensure bot role is high enough in hierarchy
- Check channel-specific permission overrides
- Verify bot has required permissions

For more help, check the console logs or create an issue.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

Created by [d0mkaaa](https://github.com/d0mkaaa)
