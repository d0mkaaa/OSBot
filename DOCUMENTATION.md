# OSBot Documentation Index

Quick navigation guide for all OSBot documentation.

## Core Documentation

### Getting Started
- **[README.md](README.md)** - Project overview, features, and quick start guide
- **[SETUP.md](SETUP.md)** - Detailed installation and configuration instructions
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and project instructions for AI assistants

### Command Reference
- **[COMMANDS.md](COMMANDS.md)** - Complete command reference with examples and usage
- **[CONFIGURATION.md](CONFIGURATION.md)** - Bot configuration guide and best practices

### Advanced Features
- **[SYSTEMS.md](SYSTEMS.md)** - Production systems (backups, health monitoring, graceful shutdown)
- **[DASHBOARD.md](DASHBOARD.md)** - Web dashboard setup, API endpoints, and features
- **[LOCALIZATION.md](LOCALIZATION.md)** - Multi-language support and translation guide

## Quick Links

### For Users
- [Quick Start](README.md#quick-start) - Get the bot running in minutes
- [Commands List](COMMANDS.md#table-of-contents) - All available commands
- [Configuration Options](CONFIGURATION.md#configuration-examples) - Configure for your server
- [Setting Server Language](LOCALIZATION.md#quick-start) - Change bot language

### For Developers
- [Project Structure](README.md#project-structure) - Codebase organization
- [Development Scripts](SETUP.md#available-scripts) - Build, deploy, and run commands
- [Adding Commands](CLAUDE.md#when-adding-or-modifying-features) - Development workflow
- [Localization Guide](LOCALIZATION.md#adding-localization-to-commands) - Add multi-language support

### For Server Administrators
- [Initial Setup](SETUP.md#initial-server-configuration) - First-time configuration
- [Auto-Moderation](CONFIGURATION.md#auto-moderation) - Configure content filters
- [Level System](CONFIGURATION.md#xp--leveling-system) - Set up XP and rewards
- [Dashboard Access](DASHBOARD.md#usage) - Web interface guide

## Feature Documentation

### Moderation & Safety
- [Auto-Moderation](CONFIGURATION.md#auto-moderation) - Automated content filtering
- [Moderation Commands](COMMANDS.md#moderation-commands) - Ban, kick, warn, mute, etc.
- [Audit Logging](CONFIGURATION.md#logging-configuration) - Track all actions

### Engagement & Leveling
- [XP System](CONFIGURATION.md#xp--leveling-system) - Configure leveling
- [Level Roles](CONFIGURATION.md#set-up-level-roles) - Automatic role rewards
- [Leaderboards](COMMANDS.md#leaderboard) - Track top members

### Utility Features
- [Ticket System](CONFIGURATION.md#ticket-system) - Support ticket setup
- [Reaction Roles](CONFIGURATION.md#reaction-roles) - Self-assignable roles
- [Giveaways](COMMANDS.md#giveaway) - Create and manage giveaways
- [Custom Tags](CONFIGURATION.md#custom-tags--rules) - Server-specific commands

### Production Systems
- [Database Backups](SYSTEMS.md#1-database-backup-system) - Automated backup system
- [Health Monitoring](SYSTEMS.md#2-health-monitoring-system) - Bot health checks
- [Graceful Shutdown](SYSTEMS.md#3-graceful-shutdown-system) - Safe shutdown process

### Dashboard Features
- [Live Chat Viewer](DASHBOARD.md#real-time-features) - Real-time chat monitoring
- [Permission Manager](DASHBOARD.md#dashboard-features) - Visual role editor
- [Analytics](DASHBOARD.md#dashboard-features) - Charts and metrics
- [Bulk Actions](DASHBOARD.md#dashboard-features) - Mass operations
- [Console Logs](DASHBOARD.md#real-time-features) - Live log streaming

## Troubleshooting

### Common Issues
- [Bot doesn't come online](SETUP.md#bot-doesnt-come-online)
- [Commands don't show up](SETUP.md#commands-dont-show-up-in-discord)
- [Permission errors](SETUP.md#bot-has-no-permissions)
- [Database errors](SETUP.md#database-errors)

### System-Specific Issues
- [Backup Issues](SYSTEMS.md#backup-issues)
- [Health Check Issues](SYSTEMS.md#health-check-issues)
- [Shutdown Issues](SYSTEMS.md#shutdown-issues)
- [Dashboard Login Fails](DASHBOARD.md#troubleshooting)

## Reference

### Configuration Files
- `.env` - Environment variables ([example](.env.example))
- `src/locales/*.json` - Translation files
- `src/database/schema.sql` - Database structure

### API Reference
- [i18n API](LOCALIZATION.md#api-reference) - Translation functions
- [Dashboard API](DASHBOARD.md#api-endpoints) - HTTP endpoints
- [Health API](DASHBOARD.md#health-monitoring) - Health check endpoint

## Contributing

Want to contribute to OSBot?

1. Check [CLAUDE.md](CLAUDE.md) for development guidelines
2. Read [LOCALIZATION.md](LOCALIZATION.md) to add translations
3. Review existing code structure in [README.md](README.md#project-structure)
4. Test your changes following [SETUP.md](SETUP.md#running-the-bot)

## Support

- **Issues**: Create an issue on GitHub
- **Questions**: Check documentation first, then ask in Discord
- **Feature Requests**: Open a GitHub issue with the feature request template

---

**Last Updated:** December 2025
**Version:** 1.0.0
**Documentation Files:** 8 core files
