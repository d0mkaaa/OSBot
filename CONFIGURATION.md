# Configuration Guide

Complete guide for configuring OSBot for your Discord server.

## Table of Contents

- [Initial Setup](#initial-setup)
- [Logging Configuration](#logging-configuration)
- [Welcome & Goodbye System](#welcome--goodbye-system)
- [XP & Leveling System](#xp--leveling-system)
- [Auto-Moderation](#auto-moderation)
- [Reaction Roles](#reaction-roles)
- [Ticket System](#ticket-system)
- [Starboard](#starboard)
- [Custom Tags & Rules](#custom-tags--rules)
- [Advanced Configuration](#advanced-configuration)
- [Best Practices](#best-practices)

---

## Initial Setup

After inviting the bot and deploying commands, follow these steps for basic configuration:

### 1. Check Bot Status

```
/ping
/botinfo
```

Verify the bot is online and responding.

### 2. Set Up Essential Channels

Create dedicated channels for bot functionality:

- `#logs` - General event logs
- `#mod-logs` - Moderation action logs
- `#welcome` - Welcome messages
- `#level-ups` - Level-up announcements (optional)
- `#starboard` - Popular messages (optional)

### 3. Configure Basic Settings

```
/config log_channel channel:#logs
/config audit_log_channel channel:#mod-logs
```

---

## Logging Configuration

The bot provides comprehensive logging for server events and moderation actions.

### Event Logging

Configure where general events are logged:

```
/config log_channel channel:#logs
```

**What gets logged:**
- Member joins and leaves
- Message edits and deletions
- Role updates
- Channel updates
- Guild updates
- Bans and unbans

### Enable/Disable Specific Event Types

```
# Enable role event logging
/config log_role_events enabled:true

# Enable message event logging
/config log_message_events enabled:true
```

### Audit Logging

Configure where moderation actions are logged:

```
/config audit_log_channel channel:#mod-logs
```

**What gets logged:**
- All moderation actions (ban, kick, warn, mute, etc.)
- Auto-moderation actions
- Configuration changes
- Role additions/removals
- Custom command usage

### Log Format

Event logs appear as embeds with:
- Event type and emoji
- Timestamp
- Relevant user information
- Action details
- Before/after values (for updates)

Example log entry:
```
🔨 Member Banned
Moderator: Admin#1234 (123456789)
Target: Spammer#5678 (987654321)
Reason: Advertising
Delete Days: 7
Timestamp: Today at 3:45 PM
```

---

## Welcome & Goodbye System

Greet new members and say goodbye to leaving members.

### Configure Welcome Messages

```
/config welcome_message message:Welcome {user} to {server}! 🎉 We now have {membercount} members!
/config welcome_channel channel:#welcome
```

### Configure Goodbye Messages

```
/config goodbye_message message:Goodbye {user}! Thanks for being part of {server}. 👋
/config goodbye_channel channel:#goodbye
```

### Available Placeholders

Use these placeholders in your messages:

| Placeholder | Description | Example Output |
|------------|-------------|----------------|
| `{user}` | Mentions the user | @Username#1234 |
| `{username}` | User's name only | Username |
| `{server}` | Server name | My Awesome Server |
| `{membercount}` | Total members | 1,234 |

### Example Configurations

**Simple Welcome:**
```
Welcome {user}!
```

**Detailed Welcome:**
```
Welcome to {server}, {user}! 🎉

Please read the rules in #rules and have fun!

You are member #{membercount}!
```

**Goodbye Message:**
```
{username} has left {server}. We'll miss you! 👋
```

### Disable Welcome/Goodbye

To disable, clear the message or channel:

```
/config welcome_message message:
/config welcome_channel channel:
```

---

## XP & Leveling System

Reward active members with XP and levels.

### Enable XP System

```
/config xp_enabled enabled:true
```

### Configure XP Gain

```
# XP cooldown (seconds between XP gains per user)
/config xp_cooldown seconds:60

# Minimum XP per message
/config xp_min xp:15

# Maximum XP per message
/config xp_max xp:25
```

**How it works:**
- Users gain random XP between min and max for each message
- Cooldown prevents spam farming
- Default: 15-25 XP every 60 seconds

### Configure Level-Up Messages

```
/config level_up_message message:Congrats {user}! You reached level {level}! 🎉
/config level_up_channel channel:#level-ups
```

**Available placeholders:**
- `{user}` - User mention
- `{level}` - New level reached

**Examples:**

```
# Simple
Congrats {user}! Level {level}!

# Detailed
🎉 {user} just leveled up to level {level}! Keep it up!

# Minimal
{user} → Level {level}
```

### Disable Level-Up Announcements

To announce in DMs instead of channel:

```
/config level_up_channel channel:
```

User will receive a DM instead.

### Set Up Level Roles

Reward users with roles at specific levels:

```
/levelroles add level:5 role:@Newbie
/levelroles add level:10 role:@Active Member
/levelroles add level:20 role:@Regular
/levelroles add level:30 role:@Veteran
/levelroles add level:50 role:@Elite
/levelroles add level:75 role:@Legend
```

**View level roles:**
```
/levelroles list
```

**Remove a level role:**
```
/levelroles remove level:10
```

**Important Notes:**
- Bot's role must be higher than level roles
- Level roles are automatically assigned when user reaches the level
- Users keep roles from previous levels
- Roles are retroactively assigned (users already at high levels get all appropriate roles)

### Disable XP System

```
/config xp_enabled enabled:false
```

This stops XP gain but preserves existing XP data.

---

## Auto-Moderation

Automatically moderate content based on configurable rules.

### Configure Auto-Mod Modules

#### Spam Detection

Detect and act on message spam:

```
/automod spam enabled:true threshold:5 interval:5
```

- `threshold` - Messages before action (3-10, default: 5)
- `interval` - Time window in seconds (3-30, default: 5)

**Example:** `threshold:5 interval:5` = 5 messages in 5 seconds triggers action

#### Profanity Filter

Filter profane words and slurs:

```
/automod profanity enabled:true preset:moderate
```

**Presets:**

| Preset | Description |
|--------|-------------|
| `strict` | Blocks most profanity including mild words |
| `moderate` | Blocks common profanity and all slurs (recommended) |
| `slurs_only` | Blocks only slurs and hate speech |
| `custom` | Use your own word list |
| `off` | Clear word list |

**Custom word list:**
```
/automod profanity enabled:true preset:custom custom_words:word1,word2,word3
```

#### Link Filtering

Block links with optional whitelist:

```
/automod links enabled:true whitelist:youtube.com,github.com,twitter.com
```

- Without whitelist: Blocks all links
- With whitelist: Allows only specified domains

**Examples:**
```
# Block all links
/automod links enabled:true

# Allow specific domains
/automod links enabled:true whitelist:youtube.com,github.com

# Disable
/automod links enabled:false
```

#### Caps Detection

Detect excessive caps usage:

```
/automod caps enabled:true threshold:70
```

- `threshold` - Caps percentage (50-100, default: 70)

**Example:** `threshold:70` = Messages with >70% caps trigger action

#### Mass Mentions

Detect mass mentions/pings:

```
/automod mentions enabled:true threshold:5
```

- `threshold` - Max mentions (3-20, default: 5)

**Example:** `threshold:5` = Messages with >5 mentions trigger action

#### Discord Invites

Block Discord invite links:

```
/automod invites enabled:true allow_own:true
```

- `allow_own` - Allow this server's own invites (default: false)

**Examples:**
```
# Block all invites
/automod invites enabled:true allow_own:false

# Allow own server invites
/automod invites enabled:true allow_own:true
```

### Configure Auto-Mod Actions

Set what happens when rules are violated:

```
/automod action type:warn
```

**Action Types:**

| Action | Description |
|--------|-------------|
| `delete` | Delete message only (silent) |
| `warn` | Delete message and warn user |
| `timeout` | Delete message and timeout for 5 minutes |
| `kick` | Delete message and kick user |
| `ban` | Delete message and ban user |

**Recommended:** Start with `warn` or `delete`, escalate if needed.

### Progressive Punishment

Automatically escalate punishment for repeat offenders:

```
/automod threshold violations:3 escalate_to:timeout duration:30
```

- `violations` - Number of violations in 1 hour before escalating (0-10)
- `escalate_to` - Action to take (warn, timeout, kick, ban)
- `duration` - Timeout duration in minutes (if escalate_to is timeout)

**Example:** `violations:3 escalate_to:timeout duration:30`
- First 2 violations: Use default action (e.g., delete)
- 3rd violation within 1 hour: Timeout for 30 minutes

**Disable progressive punishment:**
```
/automod threshold violations:0
```

### View Auto-Mod Status

```
/automod status
```

Shows all configured auto-mod settings in a detailed embed.

### Recommended Configurations

**Light Moderation:**
```
/automod spam enabled:true threshold:7 interval:5
/automod profanity enabled:true preset:slurs_only
/automod mentions enabled:true threshold:10
/automod action type:delete
/automod threshold violations:0
```

**Moderate Moderation (Recommended):**
```
/automod spam enabled:true threshold:5 interval:5
/automod profanity enabled:true preset:moderate
/automod caps enabled:true threshold:70
/automod mentions enabled:true threshold:5
/automod invites enabled:true allow_own:true
/automod action type:warn
/automod threshold violations:3 escalate_to:timeout duration:30
```

**Strict Moderation:**
```
/automod spam enabled:true threshold:3 interval:5
/automod profanity enabled:true preset:strict
/automod links enabled:true whitelist:youtube.com,github.com
/automod caps enabled:true threshold:60
/automod mentions enabled:true threshold:3
/automod invites enabled:true allow_own:false
/automod action type:timeout
/automod threshold violations:2 escalate_to:kick
```

### Auto-Mod Exemptions

**Note:** Currently, users with `Administrator` or `Manage Messages` permissions are exempt from auto-moderation. Future updates may add role-based exemptions.

---

## Reaction Roles

Allow users to self-assign roles by reacting to messages.

### Setup Process

#### 1. Create a Reaction Role Message

First, create a message explaining the roles:

```
/say channel:#roles message:React to get roles!

🎮 - Gamer
🎨 - Artist
📚 - Reader
🎵 - Music Lover
```

Copy the message ID (right-click message → Copy Message ID with Developer Mode enabled).

#### 2. Add Reaction Roles

```
/reactionrole add message_id:123456789012345678 emoji:🎮 role:@Gamer
/reactionrole add message_id:123456789012345678 emoji:🎨 role:@Artist
/reactionrole add message_id:123456789012345678 emoji:📚 role:@Reader
/reactionrole add message_id:123456789012345678 emoji:🎵 role:@Music Lover
```

The bot will automatically add the emoji reactions to the message.

#### 3. How It Works

- Users react with an emoji to get the role
- Users remove reaction to lose the role
- Bot handles role assignment automatically
- Supports custom emojis (must be from a server the bot is in)

### Manage Reaction Roles

**List all reaction roles:**
```
/reactionrole list
```

**Remove a reaction role:**
```
/reactionrole remove message_id:123456789012345678 emoji:🎮
```

### Best Practices

1. **Create a dedicated channel** (#roles)
2. **Use clear descriptions** for each emoji
3. **Group related roles** on the same message
4. **Use recognizable emojis** that match the role
5. **Test first** in a test channel

### Example Setups

**Gaming Roles:**
```
React for your favorite games!
🎮 - General Gamer
⚔️ - RPG Fan
🔫 - FPS Player
🏎️ - Racing Fan
```

**Notification Roles:**
```
React to get pinged for:
📢 - Announcements
🎉 - Events
📰 - News
🎁 - Giveaways
```

**Color Roles:**
```
Pick your color:
🔴 - Red
🔵 - Blue
🟢 - Green
🟡 - Yellow
🟣 - Purple
```

---

## Ticket System

Support ticket system for private user-staff communication.

### How It Works

1. User runs `/ticket create reason:I need help with...`
2. Bot creates a private channel only visible to user and staff
3. Staff members help the user
4. Staff closes ticket with `/ticket close`
5. Bot creates transcript and deletes channel

### Setup Requirements

**Bot Permissions:**
- Manage Channels (to create/delete ticket channels)
- Manage Permissions (to set channel permissions)
- Send Messages
- Embed Links

**Staff Role:**
Users with `Manage Messages` permission can see and close tickets.

### Usage

**Create a ticket:**
```
/ticket create reason:I can't access #members-only
```

**Close a ticket (Moderator):**
```
/ticket close reason:Issue resolved
```

### Customization

The ticket system uses these defaults:
- Channel name: `ticket-{username}-{number}`
- Category: None (creates in root)
- Permissions: User + Staff only

**Future:** Add configuration options for ticket category, support role, etc.

---

## Starboard

Highlight popular messages with a starboard.

### Setup

```
/config starboard_channel channel:#starboard
/config starboard_threshold threshold:5
```

- `starboard_channel` - Where starred messages appear
- `starboard_threshold` - Reaction count needed (default: 5)

### How It Works

1. Users react to a message with ⭐ (star emoji)
2. When reactions reach threshold, bot posts to starboard
3. Shows original message, author, and reaction count
4. Updates if more people react
5. Removes from starboard if reactions drop below threshold

### Example

User posts funny message → 5 people react with ⭐ → Bot posts to #starboard:

```
⭐ 5 | #general

[Original message content]

- Author#1234
[Jump to message link]
```

### Disable Starboard

```
/config starboard_channel channel:
```

---

## Custom Tags & Rules

### Custom Tags

Create quick-access text snippets.

#### Create Tags

```
/tag create name:rules content:Read our rules at https://example.com/rules
/tag create name:support content:For support, create a ticket with /ticket create
/tag create name:faq content:Check out our FAQ at https://example.com/faq
```

#### Use Tags

```
/tag get name:rules
```

Bot sends the tag content.

#### Manage Tags

```
# List all tags
/tag list

# Delete a tag
/tag delete name:rules
```

**Best Practices:**
- Keep tags concise
- Use descriptive names
- Create tags for frequently asked questions
- Update tags when information changes

### Server Rules

Display numbered server rules.

#### Set Rules

```
/rules set rule_number:1 content:Be respectful to all members
/rules set rule_number:2 content:No spam, advertising, or self-promotion
/rules set rule_number:3 content:Keep content appropriate for all ages
/rules set rule_number:4 content:No harassment, hate speech, or discrimination
/rules set rule_number:5 content:Follow Discord's Terms of Service and Community Guidelines
```

#### Display Rules

```
/rules show
```

Shows all rules in a formatted embed.

#### Remove a Rule

```
/rules remove rule_number:3
```

**Note:** This creates a gap in numbering. Consider renumbering remaining rules.

---

## Advanced Configuration

### Auto-Role on Join

Automatically assign a role when users join:

```
/config auto_role role:@Member
```

**Disable:**
```
/config auto_role role:
```

**Use Cases:**
- Verification systems (assign unverified role)
- Default member role
- Access control

### View All Settings

```
/config view
```

Shows all configured settings for your server.

### Database Management

The bot stores all data in `data/bot.db` (SQLite database).

**Tables:**
- `guilds` - Server settings
- `users` - User XP and data
- `warnings` - Warning records
- `audit_logs` - Moderation actions
- `tickets` - Ticket data
- `reaction_roles` - Reaction role mappings
- `tags` - Custom tags
- `reminders` - Scheduled reminders
- `afk_users` - AFK statuses
- `giveaways` - Giveaway data
- `locked_nicknames` - Locked nickname tracking

**Backup:**
```bash
# Copy database file
cp data/bot.db backups/bot-$(date +%Y%m%d).db
```

**Reset:**
```bash
# WARNING: Deletes all data!
rm data/bot.db
# Restart bot - database will be recreated
```

### Environment Variables

Configure bot behavior via `.env`:

```env
# Required
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id

# Optional
DEV_GUILD_ID=guild_id_for_instant_command_deployment
```

---

## Best Practices

### 1. Role Hierarchy

Configure your server's role hierarchy properly:

```
┌─ Server Owner
├─ Administrators
├─ Moderators
├─ [BOT ROLE] ← Must be here!
├─ Level Roles
├─ Reaction Roles
└─ @everyone
```

**Important:**
- Bot role must be above all roles it needs to manage
- Bot role must be above all level roles
- Bot role must be above all reaction roles
- Bot cannot moderate users with higher roles

### 2. Permission Management

**Moderator Permissions:**
- Kick Members - For `/kick`
- Ban Members - For `/ban`, `/tempban`, `/softban`, `/unban`
- Moderate Members - For `/mute`, `/unmute`, `/warn`, `/voice`
- Manage Messages - For `/clear`, `/embed`, `/say`
- Manage Roles - For `/role`, `/massrole`
- Manage Nicknames - For `/nickname`
- Manage Channels - For `/lockdown`, ticket system

**Administrator Permissions:**
- Manage Guild - For `/config`, `/automod`, `/levelroles`, `/rules`

### 3. Channel Organization

Recommended channel structure:

```
📋 INFORMATION
├─ #rules
├─ #announcements
└─ #welcome

💬 CHAT
├─ #general
├─ #memes
└─ #bot-commands

🎮 GAMING
├─ #gaming-chat
└─ #looking-for-group

🔊 VOICE TEXT CHANNELS
├─ #voice-1
└─ #voice-2

📊 LOGGING (Staff Only)
├─ #logs
├─ #mod-logs
└─ #starboard

🎫 TICKETS
└─ (Ticket channels created here)
```

### 4. Initial Configuration Checklist

After setup, configure these in order:

- [ ] Set log channel (`/config log_channel`)
- [ ] Set audit log channel (`/config audit_log_channel`)
- [ ] Configure welcome message (`/config welcome_message` + `welcome_channel`)
- [ ] Enable XP system (`/config xp_enabled`)
- [ ] Set up level roles (`/levelroles add`)
- [ ] Configure auto-moderation (`/automod`)
- [ ] Set up reaction roles (`/reactionrole`)
- [ ] Create server rules (`/rules set`)
- [ ] Test all features
- [ ] Announce bot to server

### 5. Regular Maintenance

**Weekly:**
- Review audit logs
- Check for unusual activity
- Update auto-mod rules if needed

**Monthly:**
- Backup database
- Review and update rules/tags
- Check for bot updates
- Review level role assignments

**As Needed:**
- Adjust auto-mod thresholds
- Update welcome messages
- Add new level roles
- Create new reaction roles

### 6. Security Recommendations

1. **Protect `.env` file** - Never commit to git
2. **Reset token if leaked** - Immediately reset in Discord Developer Portal
3. **Limit bot permissions** - Only grant what's needed
4. **Regular backups** - Backup database regularly
5. **Monitor logs** - Check for abuse or errors
6. **Keep updated** - Update dependencies regularly
7. **Role hierarchy** - Properly configure role positions
8. **Channel permissions** - Review permission overrides

### 7. Performance Optimization

**For Large Servers (1000+ members):**
- Increase XP cooldown to reduce database writes: `/config xp_cooldown seconds:120`
- Use `delete` action for auto-mod instead of `warn` to reduce audit log spam
- Disable event logging for less critical events
- Regularly clean old audit logs from database

**For Small Servers:**
- Default settings work well
- Can enable all logging features
- Can use lower XP cooldowns

### 8. Troubleshooting Configuration

**Bot not responding to configuration:**
- Check bot has Manage Guild permission
- Verify bot role is high enough
- Check command syntax

**Level roles not assigning:**
- Verify bot role is above level roles
- Check `/levelroles list`
- Verify XP is enabled

**Auto-mod not working:**
- Check `/automod status`
- Verify bot has Manage Messages permission
- Check users aren't exempt (Manage Messages permission)

**Welcome messages not sending:**
- Check welcome channel is set
- Verify bot can send messages in that channel
- Check welcome message is set

---

## Configuration Examples

### Example 1: Community Server

```bash
# Logging
/config log_channel channel:#server-logs
/config audit_log_channel channel:#mod-logs
/config log_role_events enabled:true
/config log_message_events enabled:true

# Welcome System
/config welcome_message message:Welcome {user} to {server}! Check out #rules and enjoy your stay! 🎉
/config welcome_channel channel:#welcome
/config goodbye_message message:{username} has left the server. Goodbye! 👋
/config goodbye_channel channel:#goodbye

# XP System
/config xp_enabled enabled:true
/config xp_cooldown seconds:60
/config xp_min xp:15
/config xp_max xp:25
/config level_up_message message:🎉 Congrats {user}! You've reached level {level}!
/config level_up_channel channel:#level-ups

# Level Roles
/levelroles add level:5 role:@Newbie
/levelroles add level:10 role:@Active
/levelroles add level:25 role:@Regular
/levelroles add level:50 role:@Veteran

# Auto-Moderation
/automod spam enabled:true threshold:5 interval:5
/automod profanity enabled:true preset:moderate
/automod caps enabled:true threshold:70
/automod mentions enabled:true threshold:5
/automod invites enabled:true allow_own:true
/automod action type:warn
/automod threshold violations:3 escalate_to:timeout duration:30

# Starboard
/config starboard_channel channel:#starboard
/config starboard_threshold threshold:5
```

### Example 2: Gaming Server

```bash
# Logging
/config log_channel channel:#logs
/config audit_log_channel channel:#mod-actions

# Welcome
/config welcome_message message:Welcome {user}! React in #roles to get game roles! 🎮
/config welcome_channel channel:#welcome
/config auto_role role:@Unverified

# XP System
/config xp_enabled enabled:true
/config xp_cooldown seconds:90
/config level_up_channel channel:#bot-spam

# Level Roles
/levelroles add level:10 role:@Gamer
/levelroles add level:30 role:@Pro Gamer
/levelroles add level:60 role:@Elite Gamer

# Light Auto-Mod
/automod spam enabled:true threshold:7 interval:5
/automod profanity enabled:true preset:slurs_only
/automod action type:delete
```

### Example 3: Professional/Business Server

```bash
# Logging
/config log_channel channel:#audit-log
/config audit_log_channel channel:#mod-log
/config log_role_events enabled:true
/config log_message_events enabled:true

# Welcome
/config welcome_message message:Welcome to {server}, {user}! Please read #guidelines before participating.
/config welcome_channel channel:#arrivals

# No XP System
/config xp_enabled enabled:false

# Strict Auto-Mod
/automod spam enabled:true threshold:4 interval:5
/automod profanity enabled:true preset:strict
/automod links enabled:true whitelist:company-website.com
/automod caps enabled:true threshold:60
/automod mentions enabled:true threshold:3
/automod invites enabled:true allow_own:false
/automod action type:timeout
/automod threshold violations:2 escalate_to:kick
```

---

For command usage, see [COMMANDS.md](COMMANDS.md).
For setup instructions, see [SETUP.md](SETUP.md).
