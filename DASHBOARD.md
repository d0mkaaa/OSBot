# Web Dashboard

Optional web-based management interface for the Discord bot.

## Features

- Discord OAuth2 authentication
- Server configuration management
- Live statistics and analytics
- Ticket system overview
- Warnings management
- Audit logs viewer
- Responsive UI with Tailwind CSS

## Setup

### 1. Discord OAuth2 Configuration

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application
3. Navigate to OAuth2 → General
4. Add redirect URL: `http://localhost:3000/auth/callback`
5. Copy the **Client Secret**

### 2. Environment Variables

Add to your `.env` file:

```env
DASHBOARD_ENABLED=true
DASHBOARD_PORT=3000
DASHBOARD_URL=http://localhost:3000
DASHBOARD_SESSION_SECRET=your_random_session_secret_here
OAUTH2_CLIENT_SECRET=your_client_secret_from_discord
```

**Important:**
- Generate a strong random string for `DASHBOARD_SESSION_SECRET`
- Never commit the `.env` file to version control
- Use a different session secret in production

### 3. Start the Bot

```bash
bun run dev
```

The dashboard will be available at `http://localhost:3000`

## Usage

1. Visit `http://localhost:3000`
2. Click "Login with Discord"
3. Authorize the application
4. Select a server you have administrator permissions in
5. Manage server configuration

## API Endpoints

### Authentication

- `GET /auth/login` - Initiate Discord OAuth2 login
- `GET /auth/callback` - OAuth2 callback
- `GET /auth/logout` - Logout
- `GET /auth/user` - Get current user info

### Server Management

All endpoints require authentication and administrator permissions for the guild.

- `GET /api/guilds/:guildId/config` - Get server configuration
- `PATCH /api/guilds/:guildId/config` - Update server configuration
- `GET /api/guilds/:guildId/tickets` - Get all tickets
- `GET /api/guilds/:guildId/warnings` - Get all warnings (supports `?search=`, `?userId=`, `?moderatorId=`)
- `DELETE /api/guilds/:guildId/warnings/:warningId` - Remove a warning
- `GET /api/guilds/:guildId/logs` - Get audit logs (supports `?search=`, `?actionType=`, `?moderatorId=`, `?targetId=`, `?limit=`)
- `GET /api/guilds/:guildId/stats` - Get server statistics with health metrics

### Analytics Endpoints

- `GET /api/guilds/:guildId/analytics/messages` - Message statistics (supports `?from=` and `?to=` timestamps)
- `GET /api/guilds/:guildId/analytics/members` - Member join/leave data
- `GET /api/guilds/:guildId/analytics/commands` - Command usage statistics
- `GET /api/guilds/:guildId/analytics/moderation` - Moderation actions over time
- `GET /api/guilds/:guildId/analytics/top-users` - Top 10 most active users
- `GET /api/guilds/:guildId/analytics/top-channels` - Top 10 most active channels

### Dashboard Security

- `GET /api/dashboard-audit` - Get dashboard audit logs (supports `?userId=`, `?guildId=`, `?actionType=`, `?startDate=`, `?endDate=`, `?limit=`, `?offset=`)
- `GET /api/dashboard-audit/stats` - Get dashboard action statistics (supports `?userId=`, `?guildId=`)

### Health Monitoring

- `GET /api/health` - Get bot health metrics (public endpoint for monitoring)

**Response (Healthy):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": 1701691200000,
    "uptime": 432000000,
    "memory": {
      "used": 145,
      "total": 512,
      "percentage": 28
    },
    "database": {
      "connected": true,
      "responseTime": 12
    },
    "discord": {
      "connected": true,
      "ping": 45,
      "guilds": 150
    },
    "errors": []
  }
}
```

**Status Codes:**
- `200 OK` - Bot is healthy or degraded
- `503 Service Unavailable` - Bot is unhealthy

### Real-Time Features

#### WebSocket Endpoints

**Console Logs:** `ws://localhost:3000/ws/logs`
- Real-time console log streaming
- Filter by level (info, warn, error, debug, success, system)
- Search and export capabilities

**Live Chat:** `ws://localhost:3000/ws/chat`
- Real-time message streaming for selected channels
- Supports channel switching
- Read-only message viewing

#### Dashboard Features

The dashboard includes the following tabs:

1. **Overview** - Server statistics and quick actions
2. **Configuration** - Bot settings and channel configuration
3. **Moderation** - Warnings, tickets, and audit logs
4. **Live Chat** - Real-time read-only chat viewer
5. **Permissions** - Visual role permission editor
6. **Appeals** - Moderation appeal queue management
7. **Analytics** - Real-time charts and metrics with search
8. **Bulk Actions** - Mass user operations (ban, kick, role assignment)
9. **Backups** - Server configuration backup and restore
10. **Console** - Live console log viewer
11. **Dashboard Security** - Dashboard access and action audit logs

### Search & Filter Capabilities

**Warnings Tab:**
- Real-time search by User ID, Moderator ID, or Reason
- Case-insensitive partial matching
- Instant filtering as you type
- No results indicator when search yields nothing
- Clear search to restore full list

**Audit Logs Tab:**
- Real-time search by Action Type, Moderator ID, Target ID, or Reason
- Filter logs instantly
- Case-insensitive search
- Partial text matching
- Track moderation actions across all fields

**Analytics Tab:**
- Fixed chart heights (300px) for optimal viewing
- No more excessive stretching
- Time range filters (24h, 7d, 30d)
- Interactive tooltips with better styling
- Responsive charts with proper scaling

**Dashboard Security Tab:**
- Track all dashboard login and logout events
- Monitor server access by dashboard users
- View all configuration changes and API actions
- Filter by user ID or action type
- See action summary statistics
- Includes IP addresses and user agents for security tracking
- Tracks successful and failed actions

## Security

- Sessions expire after 24 hours
- HTTPS enforced in production
- Administrator permissions required per guild
- Optional owner-only access restriction
- No sensitive data in client-side code
- CSRF protection via same-origin policy
- Comprehensive audit logging of all dashboard actions
- IP address and user agent tracking for security monitoring
- Automatic sanitization of sensitive data in logs

### Owner-Only Access (Optional)

To restrict dashboard access to only bot owners:

1. Add owner Discord IDs to `.env`:
```env
BOT_OWNERS=123456789012345678,987654321098765432
```

2. When `BOT_OWNERS` is set:
   - Only users with those IDs can access the dashboard
   - All API endpoints require owner verification
   - Non-owners see an "Access Restricted" message

3. When `BOT_OWNERS` is empty or not set:
   - Anyone with admin permissions in a server can access
   - More open for community-run bots

**Recommendation:** Set `BOT_OWNERS` for personal/private bots. Leave empty for public/community bots.

## Production Deployment

For production:

1. Use HTTPS with a reverse proxy (nginx/caddy)
2. Update `DASHBOARD_URL` to your domain
3. Add production redirect URL to Discord OAuth2 settings
4. Set `NODE_ENV=production`
5. Use a secure session secret (32+ characters)

Example nginx configuration:

```nginx
server {
    listen 443 ssl http2;
    server_name dashboard.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Disable Dashboard

Set in `.env`:

```env
DASHBOARD_ENABLED=false
```

## Dashboard Audit Logging

The dashboard includes comprehensive security audit logging to track all user activity for accountability and security monitoring.

### What Gets Logged

The dashboard automatically logs:
- **Login/Logout Events** - All authentication events with IP addresses and user agents
- **Server Access** - When users access specific servers through the dashboard
- **Configuration Changes** - Updates to server settings, automod, roles, etc.
- **Moderation Actions** - Warning deletions, bulk actions, appeal handling
- **API Operations** - All significant API calls including GET requests to sensitive endpoints
- **Success/Failure Status** - Whether each action completed successfully or failed

### Tracked Information

Each audit log entry includes:
- User ID, username, and discriminator
- Action type (LOGIN, LOGOUT, ACCESS_GUILD, UPDATE_CONFIG, etc.)
- Guild ID and name (if applicable)
- Resource path and HTTP method
- IP address
- User agent (browser/client information)
- Timestamp
- Success/failure status
- Error message (if failed)
- Request details (query parameters, body data)

### Viewing Audit Logs

Access the Dashboard Security tab to:
1. View all dashboard activity in chronological order
2. Filter by specific user ID to see all actions by a user
3. Filter by action type to see specific kinds of events
4. See action summary statistics showing total counts by action type
5. Monitor successful vs failed actions

### Action Types

Common action types include:
- `LOGIN` - User logged in via Discord OAuth2
- `LOGOUT` - User logged out
- `ACCESS_GUILD` - User accessed a specific server
- `VIEW_CONFIG` - User viewed server configuration
- `UPDATE_CONFIG` - User modified server settings
- `VIEW_WARNINGS` - User viewed warnings list
- `DELETE_WARNING` - User removed a warning
- `UPDATE_AUTOMOD` - User modified automod settings
- `VIEW_AUDIT_LOGS` - User viewed moderation audit logs
- `VIEW_ANALYTICS` - User accessed analytics data
- `EXECUTE_BULK_ACTION` - User performed bulk operations
- `CREATE_BACKUP` / `DELETE_BACKUP` - Backup operations

### Security Features

- **Sensitive Data Sanitization**: Passwords, tokens, secrets, and API keys are automatically redacted from logs
- **IP Tracking**: All requests include IP addresses for security analysis
- **User Agent Logging**: Browser and client information helps identify suspicious activity
- **Selective Logging**: Only significant actions are logged to keep the database manageable
- **Error Tracking**: Failed actions are flagged with error messages for troubleshooting

### API Access

Programmatically access audit logs:

```bash
GET /api/dashboard-audit?userId=123456789&limit=100
GET /api/dashboard-audit?guildId=987654321&actionType=UPDATE_CONFIG
GET /api/dashboard-audit/stats?userId=123456789
```

### Use Cases

- **Security Monitoring**: Identify unauthorized access attempts or suspicious activity
- **Compliance**: Maintain records of who changed what and when
- **Troubleshooting**: Track down when and how configuration changes were made
- **Accountability**: Hold dashboard users responsible for their actions
- **Audit Trail**: Provide evidence for security incidents or disputes

## Troubleshooting

**Dashboard doesn't start:**
- Check `DASHBOARD_ENABLED=true` in `.env`
- Verify `OAUTH2_CLIENT_SECRET` is set
- Ensure port 3000 is not in use

**Login fails:**
- Verify redirect URL matches Discord settings exactly
- Check client ID and secret are correct
- Clear browser cookies and try again

**No servers shown:**
- User must have Administrator permission
- Bot must be in the server
- Try re-authorizing with Discord
