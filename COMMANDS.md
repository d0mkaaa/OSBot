# Commands Reference

Complete reference for all OSBot commands with examples and usage.

## Table of Contents

- [Moderation Commands](#moderation-commands)
- [Configuration Commands](#configuration-commands)
- [Utility Commands](#utility-commands)
- [Information Commands](#information-commands)
- [Fun Commands](#fun-commands)
- [Command Permissions](#command-permissions)

---

## Moderation Commands

Commands for server moderation. Most require specific permissions.

### `/ban`

Ban a user from the server.

**Permission Required:** Ban Members

**Usage:**
```
/ban user:@User reason:Spamming delete_days:1
```

**Parameters:**
- `user` (required) - User to ban
- `reason` (optional) - Reason for the ban
- `delete_days` (optional) - Days of messages to delete (0-7, default: 0)

**Examples:**
```
/ban user:@Spammer reason:Advertising delete_days:7
/ban user:@Troublemaker
```

**Notes:**
- Sends a DM to the user before banning (if DMs are open)
- Logs to audit log channel
- Cannot ban users with higher roles than you or the bot
- Bot's role must be higher than the target's highest role

---

### `/tempban`

Temporarily ban a user for a specified duration.

**Permission Required:** Ban Members

**Usage:**
```
/tempban user:@User duration:7d reason:Cooldown period
```

**Parameters:**
- `user` (required) - User to temporarily ban
- `duration` (required) - Ban duration (format: 1d = 1 day, 12h = 12 hours, 30m = 30 minutes)
- `reason` (optional) - Reason for the tempban
- `delete_days` (optional) - Days of messages to delete (0-7)

**Examples:**
```
/tempban user:@User duration:7d reason:Breaking rules
/tempban user:@User duration:12h
/tempban user:@User duration:30m delete_days:1
```

**Notes:**
- Bot automatically unbans after duration expires
- Notifies user via DM about duration
- Stores unban time in database

---

### `/softban`

Ban and immediately unban a user (kicks them and deletes their messages).

**Permission Required:** Ban Members

**Usage:**
```
/softban user:@User reason:Message cleanup delete_days:7
```

**Parameters:**
- `user` (required) - User to softban
- `reason` (optional) - Reason for the softban
- `delete_days` (optional) - Days of messages to delete (1-7, default: 7)

**Examples:**
```
/softban user:@Spammer delete_days:7
/softban user:@User reason:Clean slate
```

**Notes:**
- Useful for cleaning up spam without permanently banning
- User can rejoin immediately
- Deletes recent messages

---

### `/unban`

Unban a previously banned user.

**Permission Required:** Ban Members

**Usage:**
```
/unban user_id:123456789 reason:Appeal accepted
```

**Parameters:**
- `user_id` (required) - ID of the user to unban
- `reason` (optional) - Reason for unbanning

**Examples:**
```
/unban user_id:123456789012345678 reason:Ban appeal accepted
/unban user_id:123456789012345678
```

**Notes:**
- Requires user ID, not mention (user is not in server)
- To get user ID, check ban list or audit logs
- Logs to audit channel

---

### `/kick`

Kick a user from the server.

**Permission Required:** Kick Members

**Usage:**
```
/kick user:@User reason:Violating rules
```

**Parameters:**
- `user` (required) - User to kick
- `reason` (optional) - Reason for the kick

**Examples:**
```
/kick user:@User reason:Spamming
/kick user:@Troublemaker
```

**Notes:**
- Sends DM notification before kicking
- User can rejoin with a new invite
- Logs to audit channel

---

### `/warn`

Issue a warning to a user.

**Permission Required:** Moderate Members

**Usage:**
```
/warn user:@User reason:No advertising
```

**Parameters:**
- `user` (required) - User to warn
- `reason` (required) - Reason for the warning

**Examples:**
```
/warn user:@User reason:Posting invite links
/warn user:@User reason:Inappropriate language
```

**Notes:**
- Sends DM to user with warning
- Stores warning in database
- View warnings with `/case`
- Can be used for progressive punishment

---

### `/mute`

Timeout a user (prevents them from sending messages).

**Permission Required:** Moderate Members

**Usage:**
```
/mute user:@User duration:1h reason:Spamming
```

**Parameters:**
- `user` (required) - User to mute
- `duration` (required) - Timeout duration (format: 1h = 1 hour, 30m = 30 minutes)
- `reason` (optional) - Reason for the timeout

**Examples:**
```
/mute user:@User duration:1h reason:Spam
/mute user:@User duration:30m
/mute user:@User duration:1d reason:Cooldown
```

**Duration formats:**
- `m` - Minutes (e.g., 30m)
- `h` - Hours (e.g., 2h)
- `d` - Days (e.g., 7d)
- Maximum: 28 days

---

### `/unmute`

Remove a timeout from a user.

**Permission Required:** Moderate Members

**Usage:**
```
/unmute user:@User reason:Served time
```

**Parameters:**
- `user` (required) - User to unmute
- `reason` (optional) - Reason for unmuting

**Examples:**
```
/unmute user:@User reason:Appeal accepted
/unmute user:@User
```

---

### `/clear`

Bulk delete messages from a channel.

**Permission Required:** Manage Messages

**Usage:**
```
/clear amount:50 user:@User reason:Cleanup
```

**Parameters:**
- `amount` (required) - Number of messages to delete (1-100)
- `user` (optional) - Only delete messages from this user
- `reason` (optional) - Reason for deletion

**Examples:**
```
/clear amount:100
/clear amount:50 user:@Spammer
/clear amount:20 reason:Off-topic spam
```

**Notes:**
- Cannot delete messages older than 14 days (Discord limitation)
- Shows confirmation of deleted messages
- Logs to audit channel

---

### `/voice`

Moderate users in voice channels.

**Permission Required:** Moderate Members

**Subcommands:**

#### `/voice disconnect`
Disconnect a user from voice.
```
/voice disconnect user:@User reason:Disruptive
```

#### `/voice move`
Move a user to another voice channel.
```
/voice move user:@User channel:#VoiceChannel reason:Moving to correct channel
```

#### `/voice mute`
Server mute a user in voice.
```
/voice mute user:@User reason:Speaking over others
```

#### `/voice deafen`
Server deafen a user in voice.
```
/voice deafen user:@User reason:AFK
```

---

### `/nickname`

Manage user nicknames.

**Permission Required:** Manage Nicknames

**Subcommands:**

#### `/nickname change`
Change a user's nickname.
```
/nickname change user:@User nickname:NewName
```

#### `/nickname reset`
Reset a user's nickname to their username.
```
/nickname reset user:@User
```

#### `/nickname lock`
Prevent a user from changing their nickname.
```
/nickname lock user:@User nickname:LockedName
```

#### `/nickname unlock`
Allow a user to change their nickname again.
```
/nickname unlock user:@User
```

---

### `/role`

Manage user roles.

**Permission Required:** Manage Roles

**Subcommands:**

#### `/role add`
Add a role to a user.
```
/role add user:@User role:@RoleName
```

#### `/role remove`
Remove a role from a user.
```
/role remove user:@User role:@RoleName
```

**Notes:**
- Bot cannot assign roles higher than its own
- You cannot assign roles higher than your highest role

---

### `/massrole`

Bulk add or remove roles from multiple users.

**Permission Required:** Manage Roles

**Subcommands:**

#### `/massrole add`
Add a role to all members (or filtered members).
```
/massrole add role:@NewRole filter:@ExistingRole bots:false
```

**Parameters:**
- `role` (required) - Role to add
- `filter` (optional) - Only add to users with this role
- `bots` (optional) - Include bots (default: false)

#### `/massrole remove`
Remove a role from all members (or filtered members).
```
/massrole remove role:@OldRole filter:@Filter bots:false
```

**Examples:**
```
/massrole add role:@Member              # Add to all humans
/massrole add role:@Verified filter:@Active   # Add to users with Active role
/massrole remove role:@Event bots:false  # Remove from all humans
```

**Notes:**
- Shows progress during operation
- Rate limited to prevent API abuse
- Can take time for large servers

---

### `/lockdown`

Lock or unlock a channel to prevent messages.

**Permission Required:** Manage Channels

**Subcommands:**

#### `/lockdown lock`
Lock a channel.
```
/lockdown lock channel:#general reason:Spam cleanup
```

#### `/lockdown unlock`
Unlock a channel.
```
/lockdown unlock channel:#general
```

**Notes:**
- Prevents @everyone from sending messages
- Moderators can still send messages
- Useful during raids or spam attacks

---

### `/automod`

Configure auto-moderation settings.

**Permission Required:** Manage Guild

**Subcommands:**

#### `/automod spam`
Configure spam detection.
```
/automod spam enabled:true threshold:5 interval:5
```
- `threshold` - Messages before action (default: 5)
- `interval` - Time window in seconds (default: 5)

#### `/automod profanity`
Configure profanity filter.
```
/automod profanity enabled:true preset:moderate
```

**Presets:**
- `strict` - Blocks most profanity
- `moderate` - Blocks common profanity + slurs
- `slurs_only` - Blocks slurs and hate speech only
- `custom` - Use custom word list
- `off` - Clear word list

**Custom words:**
```
/automod profanity enabled:true preset:custom custom_words:word1,word2,word3
```

#### `/automod links`
Configure link filtering.
```
/automod links enabled:true whitelist:youtube.com,github.com
```

#### `/automod caps`
Configure excessive caps detection.
```
/automod caps enabled:true threshold:70
```
- `threshold` - Caps percentage (default: 70%)

#### `/automod mentions`
Configure mass mention detection.
```
/automod mentions enabled:true threshold:5
```

#### `/automod invites`
Configure Discord invite filtering.
```
/automod invites enabled:true allow_own:true
```
- `allow_own` - Allow this server's invites

#### `/automod action`
Set action for violations.
```
/automod action type:warn
```

**Action types:**
- `delete` - Delete message only
- `warn` - Warn user
- `timeout` - Timeout for 5 minutes
- `kick` - Kick from server
- `ban` - Ban from server

#### `/automod threshold`
Configure progressive punishment.
```
/automod threshold violations:3 escalate_to:timeout duration:30
```
- `violations` - Number of violations in 1 hour before escalating
- `escalate_to` - Action to take (warn, timeout, kick, ban)
- `duration` - Timeout duration in minutes (if escalate_to is timeout)

#### `/automod status`
View current auto-mod settings.
```
/automod status
```

---

### `/case`

View moderation history.

**Permission Required:** Moderate Members

**Subcommands:**

#### `/case view`
View a specific case.
```
/case view case_id:123
```

#### `/case user`
View all cases for a user.
```
/case user user:@User
```

#### `/case recent`
View recent moderation actions.
```
/case recent limit:10
```

---

### `/auditlog`

View the audit log.

**Permission Required:** Manage Guild

**Usage:**
```
/auditlog limit:20 action:MEMBER_BAN
```

**Parameters:**
- `limit` (optional) - Number of entries (default: 20)
- `action` (optional) - Filter by action type

---

## Configuration Commands

Commands for configuring bot behavior. Require Manage Guild permission.

### `/config`

Configure bot settings for your server.

**Permission Required:** Manage Guild

**Subcommands:**

#### Logging Channels

```
/config log_channel channel:#logs
/config audit_log_channel channel:#mod-logs
```

#### Welcome/Goodbye Messages

```
/config welcome_message message:Welcome {user} to {server}!
/config welcome_channel channel:#welcome
/config goodbye_message message:Goodbye {user}!
/config goodbye_channel channel:#goodbye
```

**Placeholders:**
- `{user}` - Mentions the user
- `{username}` - User's name without mention
- `{server}` - Server name
- `{membercount}` - Total members

#### Auto-Role

```
/config auto_role role:@Member
```
- Automatically assigns role when users join

#### XP System

```
/config xp_enabled enabled:true
/config xp_cooldown seconds:60
/config xp_min xp:15
/config xp_max xp:25
```

#### Level-Up Messages

```
/config level_up_message message:Congrats {user}! Level {level}!
/config level_up_channel channel:#level-ups
```

**Placeholders:**
- `{user}` - User mention
- `{level}` - New level reached

#### Event Logging

```
/config log_role_events enabled:true
/config log_message_events enabled:true
```

#### Starboard

```
/config starboard_channel channel:#starboard
/config starboard_threshold threshold:5
```

#### View Settings

```
/config view
```

---

### `/levelroles`

Configure level-based role rewards.

**Permission Required:** Manage Guild

**Subcommands:**

#### `/levelroles add`
Add a level role reward.
```
/levelroles add level:10 role:@ActiveMember
```

#### `/levelroles remove`
Remove a level role reward.
```
/levelroles remove level:10
```

#### `/levelroles list`
View all level roles.
```
/levelroles list
```

**Examples:**
```
/levelroles add level:5 role:@Newbie
/levelroles add level:10 role:@Regular
/levelroles add level:20 role:@Veteran
/levelroles add level:50 role:@Elite
```

---

### `/reactionrole`

Set up self-assignable reaction roles.

**Permission Required:** Manage Roles

**Subcommands:**

#### `/reactionrole add`
Add a reaction role.
```
/reactionrole add message_id:123456789 emoji:👋 role:@Greeter
```

**Parameters:**
- `message_id` - ID of message to add reaction to
- `emoji` - Emoji to react with
- `role` - Role to assign

#### `/reactionrole remove`
Remove a reaction role.
```
/reactionrole remove message_id:123456789 emoji:👋
```

#### `/reactionrole list`
List all reaction roles.
```
/reactionrole list
```

**Setup Example:**
1. Create a message: `/say channel:#roles message:React to get roles!`
2. Get the message ID (right-click → Copy Message ID)
3. Add reactions: `/reactionrole add message_id:123 emoji:🎮 role:@Gamer`
4. Bot adds the reaction automatically
5. Users react to get roles!

---

### `/tag`

Create and manage custom text tags.

**Permission Required:** Manage Guild (for create/delete)

**Subcommands:**

#### `/tag create`
Create a new tag.
```
/tag create name:rules content:Read our rules at...
```

#### `/tag get`
Display a tag.
```
/tag get name:rules
```

#### `/tag delete`
Delete a tag.
```
/tag delete name:rules
```

#### `/tag list`
List all tags in the server.
```
/tag list
```

---

### `/rules`

Manage server rules.

**Permission Required:** Manage Guild

**Subcommands:**

#### `/rules set`
Set a rule.
```
/rules set rule_number:1 content:Be respectful to all members
```

#### `/rules remove`
Remove a rule.
```
/rules remove rule_number:1
```

#### `/rules show`
Display all rules.
```
/rules show
```

---

## Utility Commands

General utility commands available to all users.

### `/ticket`

Support ticket system.

**Subcommands:**

#### `/ticket create`
Create a support ticket.
```
/ticket create reason:I need help with...
```
- Creates a private channel
- Only visible to user and staff
- Logs ticket creation

#### `/ticket close`
Close a ticket (Moderator only).
```
/ticket close reason:Issue resolved
```
- Archives ticket channel
- Creates transcript
- Deletes channel

---

### `/giveaway`

Manage giveaways.

**Permission Required:** Manage Events (for start/end)

**Subcommands:**

#### `/giveaway start`
Start a new giveaway.
```
/giveaway start prize:Discord Nitro duration:60 winners:1
```

**Parameters:**
- `prize` (required) - What to give away
- `duration` (required) - Duration in minutes
- `winners` (optional) - Number of winners (default: 1)

#### `/giveaway end`
End a giveaway early.
```
/giveaway end giveaway_id:123
```

#### `/giveaway reroll`
Reroll winners for a completed giveaway.
```
/giveaway reroll message_id:123456789
```

#### `/giveaway list`
List recent giveaways.
```
/giveaway list
```

**Example:**
```
/giveaway start prize:Discord Nitro 1 Month duration:1440 winners:3
```
- Creates giveaway post
- Adds 🎉 reaction
- Picks winners automatically when time ends
- Can be ended early or rerolled

---

### `/poll`

Create polls with multiple options.

**Usage:**
```
/poll question:What's your favorite color? options:Red,Blue,Green,Yellow duration:60
```

**Parameters:**
- `question` (required) - The poll question
- `options` (required) - Comma-separated options (2-10)
- `duration` (optional) - Poll duration in minutes

**Examples:**
```
/poll question:Best programming language? options:Python,JavaScript,TypeScript,Rust

/poll question:Next event? options:Movie Night,Game Night,Q&A duration:1440
```

**Notes:**
- Supports up to 10 options
- Uses number reactions (1️⃣, 2️⃣, etc.)
- Shows results when poll ends

---

### `/remind`

Set a reminder.

**Usage:**
```
/remind time:1h message:Check the oven
```

**Parameters:**
- `time` (required) - When to remind (format: 30m, 2h, 1d)
- `message` (required) - Reminder message

**Examples:**
```
/remind time:30m message:Meeting starts
/remind time:2h message:Check on the server
/remind time:1d message:Weekly task
```

**Time formats:**
- Minutes: `30m`, `45m`
- Hours: `1h`, `2h`, `12h`
- Days: `1d`, `7d`
- Maximum: 7 days

---

### `/afk`

Set your AFK status.

**Usage:**
```
/afk reason:Eating lunch
```

**Parameters:**
- `reason` (optional) - AFK reason

**Examples:**
```
/afk reason:At work
/afk reason:Sleeping
/afk
```

**Notes:**
- Bot mentions you when someone tags you
- Automatically removed when you send a message
- Shows how long you've been AFK

---

### `/embed`

Create a custom embed message.

**Permission Required:** Manage Messages

**Usage:**
```
/embed channel:#announcements title:New Update! description:We've added... color:#5865F2
```

**Parameters:**
- `channel` (required) - Channel to send embed
- `title` (optional) - Embed title
- `description` (optional) - Embed description
- `color` (optional) - Hex color code

**Examples:**
```
/embed channel:#announcements title:Server Rules description:1. Be respectful... color:#FF0000

/embed channel:#info description:Welcome to our server! color:#00FF00
```

---

### `/say`

Make the bot say something.

**Permission Required:** Manage Messages

**Usage:**
```
/say channel:#general message:Hello everyone!
```

**Parameters:**
- `channel` (required) - Channel to send message
- `message` (required) - Message content

---

### `/snipe`

View the last deleted message in a channel.

**Usage:**
```
/snipe
```

**Notes:**
- Shows last deleted message in current channel
- Includes author, content, and deletion time
- Only stores the most recent deletion per channel

---

## Information Commands

Commands that provide information. Available to all users.

### `/help`

Display all available commands with descriptions.

**Usage:**
```
/help
```

Shows categorized list of all commands with brief descriptions.

---

### `/ping`

Check the bot's latency and uptime.

**Usage:**
```
/ping
```

Shows:
- Bot latency (response time)
- API latency (Discord websocket)
- Bot uptime

---

### `/serverinfo`

Display detailed server information.

**Usage:**
```
/serverinfo
```

Shows:
- Server name and ID
- Owner
- Member count (total, humans, bots)
- Channel counts
- Role count
- Server creation date
- Boost level and count
- Server icon

---

### `/userinfo`

Display user information.

**Usage:**
```
/userinfo user:@User
```

**Parameters:**
- `user` (optional) - User to view (defaults to yourself)

Shows:
- Username and ID
- Account creation date
- Server join date
- Roles
- Avatar
- Badges

---

### `/botinfo`

Display bot statistics and information.

**Usage:**
```
/botinfo
```

Shows:
- Bot version
- Server count
- User count
- Uptime
- Memory usage
- Discord.js and Node/Bun version
- Command count

---

### `/avatar`

View and download user avatars.

**Usage:**
```
/avatar user:@User
```

**Parameters:**
- `user` (optional) - User whose avatar to view (defaults to yourself)

Shows:
- Avatar image
- Download links (PNG, JPG, WEBP)
- Server-specific avatar if applicable

---

### `/rank`

View your XP rank and level.

**Usage:**
```
/rank user:@User
```

**Parameters:**
- `user` (optional) - User to check (defaults to yourself)

Shows:
- Current level
- Total XP
- XP progress to next level
- Server rank
- Progress bar

---

### `/leaderboard`

View the XP leaderboard.

**Usage:**
```
/leaderboard
```

Shows:
- Top 10 users by XP
- Level and XP for each
- Your position if not in top 10

---

## Fun Commands

Entertainment commands available to all users.

### `/8ball`

Ask the magic 8ball a question.

**Usage:**
```
/8ball question:Will I win the lottery?
```

**Parameters:**
- `question` (required) - Your yes/no question

**Examples:**
```
/8ball question:Is today going to be a good day?
/8ball question:Should I study more?
```

---

### `/coinflip`

Flip a coin.

**Usage:**
```
/coinflip
```

Returns either Heads or Tails.

---

### `/roll`

Roll dice.

**Usage:**
```
/roll sides:20 count:2
```

**Parameters:**
- `sides` (optional) - Number of sides on the die (default: 6, max: 100)
- `count` (optional) - Number of dice to roll (default: 1, max: 10)

**Examples:**
```
/roll                    # Roll 1d6
/roll sides:20           # Roll 1d20
/roll sides:6 count:3    # Roll 3d6
```

---

### `/choose`

Pick a random option from a list.

**Usage:**
```
/choose options:Pizza,Burgers,Tacos,Sushi
```

**Parameters:**
- `options` (required) - Comma-separated list of options (2-10)

**Examples:**
```
/choose options:Yes,No,Maybe
/choose options:Red,Blue,Green,Yellow,Purple
```

---

## Command Permissions

### Permission Levels

**No Permissions Required:**
- All Information commands (`/help`, `/ping`, `/serverinfo`, `/userinfo`, `/botinfo`, `/avatar`, `/rank`, `/leaderboard`)
- All Fun commands (`/8ball`, `/coinflip`, `/roll`, `/choose`)
- `/afk`
- `/snipe`

**Manage Messages:**
- `/embed`
- `/say`
- `/clear`

**Manage Roles:**
- `/role`
- `/massrole`
- `/reactionrole`

**Manage Nicknames:**
- `/nickname`

**Kick Members:**
- `/kick`

**Ban Members:**
- `/ban`
- `/tempban`
- `/softban`
- `/unban`

**Moderate Members:**
- `/mute`
- `/unmute`
- `/warn`
- `/voice`

**Manage Channels:**
- `/lockdown`
- `/ticket close`

**Manage Guild:**
- `/config`
- `/automod`
- `/auditlog`
- `/levelroles`
- `/tag create/delete`
- `/rules`

**Manage Events:**
- `/giveaway start/end`

### Permission Hierarchy

1. **Bot Role Position**: The bot's role must be higher than any role it needs to manage or assign
2. **User Role Position**: You cannot moderate users with roles higher than your highest role
3. **Channel Permissions**: Some commands require channel-specific permissions (e.g., ticket system needs to create channels)

### Permission Overrides

Channel permission overrides can prevent the bot from working even if it has server-wide permissions. Ensure the bot has necessary permissions in specific channels.

---

## Rate Limiting

To prevent spam, all commands have a 3-second cooldown per user. If you use a command too quickly, you'll see:
```
⏱️ Please wait X seconds before using this command again.
```

---

## Additional Notes

### Placeholders

Many commands support placeholders that get replaced with dynamic values:

**Welcome/Goodbye Messages:**
- `{user}` - User mention
- `{username}` - Username
- `{server}` - Server name
- `{membercount}` - Total members

**Level-Up Messages:**
- `{user}` - User mention
- `{level}` - New level

### Best Practices

1. **Always provide reasons** for moderation actions (helps with audit logs)
2. **Test commands in a test server** before using in production
3. **Use auto-moderation** to reduce manual moderation work
4. **Set up logging channels** to track all events
5. **Configure role hierarchy** properly for the bot to work correctly
6. **Back up your database** regularly to prevent data loss

### Getting Help

- Use `/help` to see all available commands
- Check command responses for error messages
- Review console logs for detailed errors
- Refer to [CONFIGURATION.md](CONFIGURATION.md) for setup help
- Refer to [DASHBOARD.md](DASHBOARD.md) for web dashboard usage
- Create an issue on GitHub for bugs or feature requests

---

## Web Dashboard

OSBot includes a web-based dashboard for managing your server. Access it at `http://localhost:3000` (or your configured port).

### Dashboard Features

**Analytics Tab:**
- View message, member, command, and moderation statistics
- Interactive charts with time range filters (24h, 7d, 30d)
- Top active users and channels
- Fixed chart heights for better readability

**Warnings Tab:**
- View all warnings issued in your server
- Search by User ID, Moderator ID, or Reason
- Remove warnings with one click
- Real-time filtering

**Audit Logs Tab:**
- View all moderation actions
- Search by Action Type, Moderator ID, Target ID, or Reason
- Filter logs in real-time
- Track who did what and when

**Dashboard Security Tab:**
- View complete audit trail of all dashboard activity
- Track login/logout events with IP addresses
- Monitor who accesses which servers
- See all configuration changes and API actions
- Filter logs by user ID or action type
- Action summary statistics
- Security monitoring with user agent tracking

**Search Functionality:**
- All searchable tabs support real-time filtering
- Search is case-insensitive
- Matches partial text in User IDs, Moderator IDs, Reasons, and Action Types
- No results message when search yields nothing

### API Endpoints

The dashboard also provides API endpoints for programmatic access:

**Warnings:**
- `GET /api/guilds/:guildId/warnings` - Get all warnings
  - Query params: `userId`, `moderatorId`, `search`
- `DELETE /api/guilds/:guildId/warnings/:warningId` - Remove warning

**Audit Logs:**
- `GET /api/guilds/:guildId/logs` - Get audit logs
  - Query params: `actionType`, `moderatorId`, `targetId`, `search`, `limit`

**Analytics:**
- `GET /api/guilds/:guildId/analytics/messages` - Message statistics
- `GET /api/guilds/:guildId/analytics/members` - Member join/leave data
- `GET /api/guilds/:guildId/analytics/commands` - Command usage
- `GET /api/guilds/:guildId/analytics/moderation` - Moderation actions
- `GET /api/guilds/:guildId/analytics/top-users` - Top 10 active users
- `GET /api/guilds/:guildId/analytics/top-channels` - Top 10 active channels

**Dashboard Security:**
- `GET /api/dashboard-audit` - Get dashboard audit logs with filters
- `GET /api/dashboard-audit/stats` - Get action statistics

For more dashboard information, see [DASHBOARD.md](DASHBOARD.md).

---

For setup instructions, see [SETUP.md](SETUP.md).
For configuration details, see [CONFIGURATION.md](CONFIGURATION.md).
