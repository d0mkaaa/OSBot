# OSBot - Modern Discord Bot

A feature-rich Discord bot built with TypeScript, discord.js v14, and Node.js. Includes moderation, music, leveling, utility commands, web dashboard, and comprehensive multi-language support.

## Quick Start

### Prerequisites
- Node.js 18+ and npm installed
- Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
git clone https://github.com/d0mkaaa/OSBot.git
cd OSBot
npm install
cp .env.example .env
```

Edit `.env` and add your bot token:
```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_client_id
```

Deploy commands and start:
```bash
npm run deploy
npm run dev
```

## Features

### Moderation & Safety
- Auto-moderation (spam, profanity, links, caps, mass mentions, invites)
- Commands: ban, kick, tempban, mute, warn, clear, lockdown
- Mass role operations, voice moderation, progressive punishment
- Nickname management, audit logging

### Music System
- YouTube playback with queue management
- Loop modes (off/track/queue), shuffle, volume control
- Vote skip system, persistent queues across restarts
- Web dashboard controls for music playback

### Leveling & Engagement
- XP system with customizable cooldowns and gains
- Auto-assigned level roles, leaderboards, rank cards
- XP boosters for roles and channels

### Utility
- Ticket system with transcripts
- Giveaways, polls, reaction roles
- Custom tags, reminders, AFK system
- Embed builder, starboard

### Web Dashboard
- Browser-based control panel (optional)
- Real-time music player, moderation tools
- Analytics, guild settings management
- OAuth2 Discord authentication

### Multi-Language Support
- Supported: English (complete), Spanish, French
- Per-guild locale settings
- Translation key structure: `commands.{name}.{key}`
- Full i18n integration throughout codebase

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Framework**: discord.js v14
- **Database**: SQLite (better-sqlite3)
- **Dashboard**: Express.js + WebSocket

## Project Structure

```
OSBot/
├── src/
│   ├── client/          # Discord client wrapper
│   ├── commands/        # Slash commands by category
│   │   ├── configuration/
│   │   ├── fun/
│   │   ├── information/
│   │   ├── leveling/    # XP and rank commands
│   │   ├── moderation/
│   │   ├── music/       # Music system commands
│   │   └── utility/
│   ├── config/          # Environment and bot config
│   ├── dashboard/       # Web dashboard
│   │   ├── middleware/  # Auth, rate limiting
│   │   ├── public/      # Frontend assets
│   │   └── routes/      # API endpoints
│   ├── database/        # SQLite manager and schema
│   ├── events/          # Discord event handlers
│   ├── handlers/        # Command/event loaders
│   ├── locales/         # Translation files (en, es, fr)
│   ├── music/           # Music system core
│   ├── types/           # TypeScript definitions
│   └── utils/           # Shared utilities
├── data/                # Database and backups
├── CLAUDE.md            # AI assistant instructions
└── package.json
```

## Command Categories

**Moderation** - `/ban`, `/kick`, `/warn`, `/mute`, `/clear`, `/automod`, `/lockdown`, `/massrole`

**Music** - `/play`, `/skip`, `/pause`, `/resume`, `/queue`, `/nowplaying`, `/loop`, `/shuffle`, `/voteskip`

**Leveling** - `/rank`, `/leaderboard`, `/setlevel`, `/addxp`, `/removexp`

**Utility** - `/ticket`, `/giveaway`, `/poll`, `/remind`, `/afk`, `/embed`, `/say`

**Configuration** - `/config`, `/levelroles`, `/reactionrole`, `/tag`, `/rules`, `/locale`

**Information** - `/help`, `/ping`, `/serverinfo`, `/userinfo`, `/botinfo`, `/avatar`

**Fun** - `/8ball`, `/coinflip`, `/roll`, `/choose`

## Configuration

### Essential Setup

1. **Set log channels**:
```
/config log_channel #logs
/config audit_log_channel #mod-logs
```

2. **Configure auto-moderation**:
```
/automod spam enabled:true threshold:5 interval:5
/automod profanity enabled:true preset:moderate
```

3. **Set welcome messages**:
```
/config welcome_message Welcome {user} to {server}!
/config welcome_channel #welcome
```

4. **Configure XP system**:
```
/config xp_enabled enabled:true
/levelroles add level:10 role:@Active Member
```

5. **Set server language**:
```
/locale set language:en
/locale list
```

### Dashboard Setup (Optional)

Enable in `.env`:
```env
ENABLE_DASHBOARD=true
DASHBOARD_PORT=3000
DASHBOARD_SESSION_SECRET=random_secure_string
DASHBOARD_OAUTH_CLIENT_ID=your_oauth_client_id
DASHBOARD_OAUTH_CLIENT_SECRET=your_oauth_client_secret
DASHBOARD_OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

Access at `http://localhost:3000`

## Required Bot Permissions

Essential permissions for full functionality:
- Manage Roles, Manage Messages, Manage Channels
- Kick Members, Ban Members, Moderate Members
- Send Messages, Embed Links, Add Reactions
- Read Message History, Connect, Speak (for music)

**Recommended invite link**:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099780063318&scope=bot%20applications.commands
```

**Important**: Bot role must be positioned **higher** than roles it needs to manage.

## Development

### Scripts

```bash
npm run dev         # Development with hot reload
npm run build       # Compile TypeScript
npm run start       # Run production build
npm run deploy      # Deploy slash commands
```

### Database

SQLite database auto-created with tables:
- `guilds` - Guild settings and locale
- `users` - User XP and stats
- `warnings`, `audit_logs`, `tickets`
- `music_queues` - Persistent music queues
- `xp_boosters` - Role/channel XP multipliers
- `reaction_roles`, `tags`, `reminders`, `giveaways`

### Adding Translations

1. Add keys to `src/locales/en.json`:
```json
{
  "commands": {
    "mycommand": {
      "description": "Command description",
      "success": "Success message for {user}"
    }
  }
}
```

2. Use in commands:
```typescript
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const locale = getInteractionLocale(interaction);
await interaction.reply(t('commands.mycommand.success', locale, { user: 'John' }));
```

3. Copy to other locales (`es.json`, `fr.json`) and translate

## Security Features

- Input sanitization and validation
- SQL injection prevention (prepared statements)
- Rate limiting (commands and dashboard)
- Permission hierarchy enforcement
- Environment variable security
- OAuth2 authentication for dashboard
- Session management with secure cookies

## Monitoring & Logging

### Event Logging
Configure with `/config log_channel`:
- Member joins/leaves, message edits/deletes
- Role/channel/guild updates, bans/unbans

### Audit Logging
Configure with `/config audit_log_channel`:
- All moderation actions, config changes
- Auto-mod actions, custom command usage

### Health Monitoring
- Automatic health checks every 5 minutes
- Memory usage, uptime, guild count tracking
- Console logs with timestamps and colors

## Troubleshooting

**Commands not showing**
- Run `npm run deploy`
- Verify bot has `applications.commands` scope
- Check permissions in server settings

**Bot not responding**
- Verify `DISCORD_TOKEN` in `.env`
- Check console for errors
- Ensure bot is online and has permissions

**Music not playing**
- Verify bot has Connect and Speak permissions
- Check voice channel user limit
- Review console for YouTube errors

**Dashboard not loading**
- Verify `ENABLE_DASHBOARD=true` in `.env`
- Check OAuth credentials are correct
- Ensure port 3000 is not in use

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Author

Created by [d0mkaaa](https://github.com/d0mkaaa)
