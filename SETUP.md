# Setup Guide

This guide will walk you through setting up OSBot from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Creating a Discord Bot](#creating-a-discord-bot)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Bot](#running-the-bot)
6. [Inviting the Bot](#inviting-the-bot)
7. [Initial Server Configuration](#initial-server-configuration)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

- **Bun** (v1.0 or higher)
  - Install from [bun.sh](https://bun.sh)
  - Verify installation: `bun --version`

- **Git** (for cloning the repository)
  - Download from [git-scm.com](https://git-scm.com/)
  - Verify installation: `git --version`

### Required Accounts

- **Discord Account** - You need a Discord account to create a bot
- **Discord Server** - You need a server where you have admin permissions to test the bot

### System Requirements

- **Operating System**: Windows, macOS, or Linux
- **RAM**: Minimum 512MB available
- **Storage**: At least 100MB free space
- **Internet Connection**: Required for bot operation

## Creating a Discord Bot

### Step 1: Access Discord Developer Portal

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Log in with your Discord account
3. Click "New Application" in the top-right corner
4. Give your application a name (e.g., "OSBot")
5. Accept the Terms of Service and click "Create"

### Step 2: Configure Bot Settings

1. In the left sidebar, click on "Bot"
2. Click "Add Bot" and confirm by clicking "Yes, do it!"
3. You'll see your bot user has been created

**Important Bot Settings:**

- **Public Bot**: Toggle OFF if you want only you to invite the bot
- **Requires OAuth2 Code Grant**: Leave this OFF
- **Presence Intent**: Toggle ON (required for member tracking)
- **Server Members Intent**: Toggle ON (required for member events)
- **Message Content Intent**: Toggle ON (required for XP system and message events)

### Step 3: Get Your Bot Token

1. Under the "TOKEN" section, click "Reset Token"
2. Click "Yes, do it!" to confirm
3. Click "Copy" to copy your bot token
4. **Save this token securely** - you'll need it for the `.env` file

**Important**: Never share your bot token with anyone! If it's leaked, reset it immediately.

### Step 4: Get Your Client ID

1. In the left sidebar, click on "OAuth2" → "General"
2. Copy the "CLIENT ID" value
3. Save this for later use

## Installation

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <your-repository-url>

# Navigate into the project directory
cd OSBot
```

If you don't have a repository URL, you can initialize a new git repository:

```bash
# Create a new directory
mkdir OSBot
cd OSBot

# Copy all source files into this directory
# Then initialize git
git init
```

### Step 2: Install Dependencies

```bash
# Install all required packages
bun install
```

This will install:
- `discord.js` - Discord API wrapper
- `dotenv` - Environment variable management
- TypeScript and types

### Step 3: Verify Installation

```bash
# Check that dependencies installed correctly
bun --version
```

You should see the Bun version number.

## Configuration

### Step 1: Create Environment File

```bash
# Copy the example environment file
cp .env.example .env
```

If `.env.example` doesn't exist, create `.env` manually:

```bash
# On Windows (PowerShell)
New-Item -Path .env -ItemType File

# On macOS/Linux
touch .env
```

### Step 2: Configure Environment Variables

Open `.env` in your text editor and add your bot credentials:

```env
# Required: Your Discord bot token from the Developer Portal
DISCORD_TOKEN=your_bot_token_here

# Required: Your bot's client ID from the Developer Portal
CLIENT_ID=your_client_id_here

# Optional: Development guild ID for faster command deployment during testing
# Get this by right-clicking your server in Discord (with Developer Mode enabled)
# DEV_GUILD_ID=your_test_server_id_here
```

**How to get these values:**

1. **DISCORD_TOKEN**: From Discord Developer Portal → Your Application → Bot → Token (click Reset Token and copy)
2. **CLIENT_ID**: From Discord Developer Portal → Your Application → OAuth2 → General → Client ID
3. **DEV_GUILD_ID** (optional): Right-click your Discord server → Copy Server ID (requires Developer Mode enabled in Discord settings)

### Step 3: Enable Discord Developer Mode

To copy IDs in Discord, you need Developer Mode enabled:

1. Open Discord
2. Go to User Settings (gear icon)
3. Go to "Advanced" (under App Settings)
4. Toggle "Developer Mode" ON

Now you can right-click servers, users, channels, etc. to copy their IDs.

### Step 4: Verify Configuration

Your `.env` file should look like this (with your actual values):

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_client_id_here
```

## Running the Bot

### Step 1: Deploy Slash Commands

Before running the bot for the first time, deploy the slash commands:

```bash
bun run deploy
```

You should see output like:
```
Successfully registered application commands.
Registered 40+ commands globally
```

**Note**: Global command deployment can take up to 1 hour to propagate. For instant deployment during development, set `DEV_GUILD_ID` in your `.env` file.

### Step 2: Start the Bot

For development (with hot reload):

```bash
bun run dev
```

For production:

```bash
# Build first
bun run build

# Then run
bun run start
```

### Step 3: Verify Bot is Running

You should see console output like:

```
[INFO] Loading commands...
[INFO] Loaded 43 commands
[INFO] Loading events...
[INFO] Loaded 15 events
[SUCCESS] Logged in as YourBot#1234
[SUCCESS] Bot is ready and online!
```

In Discord, your bot's status should change to "Online" (green circle).

## Inviting the Bot

### Method 1: Using OAuth2 URL Generator

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Go to OAuth2 → URL Generator
4. Under "SCOPES", select:
   - `bot`
   - `applications.commands`
5. Under "BOT PERMISSIONS", select:
   - Manage Roles
   - Manage Channels
   - Kick Members
   - Ban Members
   - Moderate Members
   - Manage Nicknames
   - Manage Messages
   - Read Messages/View Channels
   - Send Messages
   - Send Messages in Threads
   - Embed Links
   - Attach Files
   - Read Message History
   - Add Reactions
   - Use External Emojis
6. Copy the generated URL at the bottom
7. Paste it in your browser and select your server

### Method 2: Using Direct Link

Replace `YOUR_CLIENT_ID` with your actual client ID:

```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=1099780063318&scope=bot%20applications.commands
```

### Step 3: Authorize the Bot

1. Open the invite URL in your browser
2. Select the server where you want to add the bot
3. Review the permissions
4. Click "Authorize"
5. Complete the CAPTCHA if prompted

Your bot should now appear in your server's member list!

## Initial Server Configuration

Once the bot is in your server, configure it for first use:

### Step 1: Check Bot Permissions

```
/botinfo
```

This shows bot status and basic information. Make sure the bot can respond.

### Step 2: Set Up Logging Channels

Create two channels for logs (recommended):

```
/config log_channel channel:#logs
/config audit_log_channel channel:#mod-logs
```

- **log_channel**: For general events (joins, leaves, message edits)
- **audit_log_channel**: For moderation actions (bans, kicks, warnings)

### Step 3: Configure Welcome/Goodbye Messages

```
/config welcome_message message:Welcome {user} to {server}! 🎉
/config welcome_channel channel:#welcome

/config goodbye_message message:{user} has left {server}. Goodbye! 👋
/config goodbye_channel channel:#goodbye
```

Available placeholders:
- `{user}` - Mentions the user
- `{username}` - User's name without mention
- `{server}` - Server name
- `{membercount}` - Total member count

### Step 4: Enable and Configure XP System

```
# Enable XP gaining
/config xp_enabled enabled:true

# Set XP cooldown (seconds between XP gains per user)
/config xp_cooldown seconds:60

# Configure XP gain amounts
/config xp_min xp:15
/config xp_max xp:25

# Enable level-up messages
/config level_up_message message:Congrats {user}! You reached level {level}! 🎉
/config level_up_channel channel:#level-ups
```

### Step 5: Set Up Level Roles

Reward users with roles when they reach certain levels:

```
/levelroles add level:5 role:@Newbie
/levelroles add level:10 role:@Active Member
/levelroles add level:20 role:@Veteran
/levelroles add level:50 role:@Elite

# View configured level roles
/levelroles list
```

### Step 6: Configure Auto-Moderation (Optional)

```
# Enable spam detection
/automod spam enabled:true threshold:5 interval:5

# Enable profanity filter
/automod profanity enabled:true preset:moderate

# Enable caps detection
/automod caps enabled:true threshold:70

# Enable mass mention detection
/automod mentions enabled:true threshold:5

# Set action for violations
/automod action type:warn

# View current settings
/automod status
```

### Step 7: Set Up Reaction Roles (Optional)

```
# Create a message for reaction roles
/say channel:#roles message:React to get roles!

# Add reaction roles (use message ID from above)
/reactionrole add message_id:123456789 emoji:👋 role:@Greeter
/reactionrole add message_id:123456789 emoji:🎮 role:@Gamer

# List all reaction roles
/reactionrole list
```

### Step 8: Create Server Rules (Optional)

```
/rules set rule_number:1 content:Be respectful to all members
/rules set rule_number:2 content:No spam or advertising
/rules set rule_number:3 content:Keep content appropriate

# Display rules
/rules show
```

### Step 9: Test Basic Functionality

Try these commands to verify everything works:

```
/ping                          # Check latency
/help                          # View all commands
/serverinfo                    # View server information
/rank                          # Check your rank (if XP is enabled)
/8ball question:Is this working?   # Test fun commands
```

## Troubleshooting

### Bot doesn't come online

**Check:**
- Is the `DISCORD_TOKEN` in `.env` correct?
- Did you copy the token correctly (no extra spaces)?
- Is the bot running? (check console for errors)
- Did you reset the token? (you need to update `.env` with the new token)

**Fix:**
```bash
# Stop the bot (Ctrl+C)
# Verify your .env file
cat .env  # macOS/Linux
type .env  # Windows

# Restart the bot
bun run dev
```

### Commands don't show up in Discord

**Check:**
- Did you run `bun run deploy`?
- Did you wait up to 1 hour for global commands? (use DEV_GUILD_ID for instant deployment)
- Does the bot have `applications.commands` scope?
- Are you in the right server?

**Fix:**
```bash
# Redeploy commands
bun run deploy

# For instant testing, add to .env:
DEV_GUILD_ID=your_server_id

# Then redeploy
bun run deploy
```

### Bot has no permissions

**Check:**
- Is the bot's role high enough in the role hierarchy?
- Does the bot have the required permissions?
- Are there channel permission overrides blocking the bot?

**Fix:**
1. Go to Server Settings → Roles
2. Move the bot's role higher (above roles it needs to manage)
3. Check the bot role has required permissions
4. Check channel permissions for `@everyone` and bot role

### Database errors

**Check:**
- Does the `data/` directory exist?
- Can the bot write to the `data/` directory?
- Is the database corrupted?

**Fix:**
```bash
# Delete database (WARNING: This deletes all data!)
rm data/bot.db  # macOS/Linux
del data\bot.db  # Windows

# Restart bot - it will recreate the database
bun run dev
```

### Bot crashes on startup

**Check console for error messages:**

Common errors:

**Error: "Used disallowed intents"**
- Fix: Enable Message Content Intent in Developer Portal → Bot settings

**Error: "Invalid token"**
- Fix: Reset token in Developer Portal and update `.env`

**Error: "Cannot find module"**
- Fix: Run `bun install` again

**Error: "EACCES: permission denied"**
- Fix: Check file permissions on the project directory

### Commands return "Missing Permissions"

**Check:**
- Does your Discord account have the required permissions?
- Most mod commands require "Administrator" or specific permissions
- Does the bot's role have necessary permissions?

**Fix:**
- Ask a server admin to give you appropriate roles
- Ensure bot role has required permissions
- Move bot role higher in hierarchy

### XP system not working

**Check:**
- Is `xp_enabled` set to true? (`/config xp_enabled enabled:true`)
- Are you testing in a channel the bot can see?
- Did you wait for the cooldown? (default: 60 seconds)
- Check console logs for errors

**Fix:**
```
/config xp_enabled enabled:true
/config xp_cooldown seconds:60
```

### Can't see event logs

**Check:**
- Did you set a log channel? (`/config log_channel channel:#logs`)
- Can the bot send messages in that channel?
- Is event logging enabled for specific events?

**Fix:**
```
/config log_channel channel:#logs
/config log_role_events enabled:true
/config log_message_events enabled:true
```

### Need more help?

- Check the main [README.md](README.md) for general information
- Check [CONFIGURATION.md](CONFIGURATION.md) for detailed config options
- Check [COMMANDS.md](COMMANDS.md) for command usage
- Review console logs for specific error messages
- Create an issue on GitHub with error logs and steps to reproduce

## Next Steps

Now that your bot is set up and running:

1. Read [CONFIGURATION.md](CONFIGURATION.md) for advanced configuration options
2. Check [COMMANDS.md](COMMANDS.md) for detailed command documentation
3. Customize auto-moderation rules for your server
4. Set up reaction roles and level roles
5. Configure logging to your preferences
6. Test all features in a test server before deploying to production

## Security Best Practices

- **Never commit `.env` to version control** - Add it to `.gitignore`
- **Reset your token immediately if leaked**
- **Use role hierarchy properly** - Bot role should be above managed roles
- **Limit bot permissions** - Only grant permissions actually needed
- **Regularly update dependencies** - Run `bun update` periodically
- **Monitor logs** - Check console and audit logs regularly
- **Backup database** - Regularly backup `data/bot.db`

## Production Deployment

For production deployment (VPS, cloud server):

1. **Use process manager**:
   ```bash
   # Using PM2 (install: npm install -g pm2)
   pm2 start "bun run start" --name osbot
   pm2 startup
   pm2 save
   ```

2. **Enable logging**:
   ```bash
   pm2 logs osbot
   ```

3. **Set up auto-restart**:
   ```bash
   pm2 restart osbot --cron "0 3 * * *"  # Restart daily at 3 AM
   ```

4. **Monitor resources**:
   ```bash
   pm2 monit
   ```

5. **Regular backups**:
   ```bash
   # Add to crontab
   0 0 * * * cp ~/OSBot/data/bot.db ~/backups/bot-$(date +\%Y\%m\%d).db
   ```

Your bot is now fully set up and ready to use!
