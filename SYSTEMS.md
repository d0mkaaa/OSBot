# OSBot System Features

## Overview

OSBot now includes three critical systems:

1. **Database Backup System** - Automated and manual database backups
2. **Health Monitoring** - Real-time system health checks and metrics
3. **Graceful Shutdown** - Proper cleanup and data integrity on shutdown

---

## 1. Database Backup System

### Features

- **Automatic Backups**: Scheduled backups at configurable intervals
- **Manual Backups**: On-demand backups via `/backup create` command
- **Retention Policy**: Automatically removes old backups
- **Restore Capability**: Restore from any previous backup
- **Safety Backups**: Creates pre-restore backup before restoration
- **WAL Support**: Backs up SQLite WAL and SHM files for consistency

### Configuration

Add to your `.env` file:

```env
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION=7
```

### Commands

#### `/backup create`
Creates a manual backup immediately.

**Example:**
```
/backup create
```

**Response:**
```
✅ Backup Created
Database backup created successfully!
📁 Path: `./backups/manual_2025-12-04T10-30-00.db`
```

#### `/backup list`
Lists all available backups with size and date.

**Example:**
```
/backup list
```

**Response:**
```
📦 Database Backups
Total backups: 7

manual_2025-12-04T10-30-00.db
Size: 12.45 MB
Date: 12/4/2025, 10:30:00 AM

auto_2025-12-04T00-00-00.db
Size: 12.40 MB
Date: 12/4/2025, 12:00:00 AM
```

#### `/backup restore`
Restores database from a specific backup file.

**Example:**
```
/backup restore backup:manual_2025-12-04T10-30-00.db
```

**Response:**
```
✅ Backup Restored
Database has been restored from backup!
📁 Backup: manual_2025-12-04T10-30-00.db

⚠️ Important
The bot should be restarted for changes to fully take effect.
```

#### `/backup status`
Shows backup system status and configuration.

**Example:**
```
/backup status
```

**Response:**
```
📊 Backup System Status

🔄 Auto Backup: ✅ Enabled
📦 Total Backups: 7
🗑️ Retention Limit: 7
📁 Backup Directory: `./backups`
```

### Automatic Behavior

- Backup created on bot startup (safety measure)
- Scheduled backups run every `BACKUP_INTERVAL_HOURS` hours
- Old backups automatically deleted when exceeding `BACKUP_RETENTION`
- Backup created before graceful shutdown

---

## 2. Health Monitoring System

### Features

- **System Metrics**: Memory usage, uptime, performance
- **Database Health**: Connection status and response time
- **Discord API Health**: WebSocket status, latency, guild count
- **Status Levels**: `healthy`, `degraded`, `unhealthy`
- **Automatic Checks**: Periodic health monitoring
- **HTTP Endpoint**: `/api/health` for external monitoring

### Configuration

Add to your `.env` file:

```env
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL_MINUTES=5
```

### Command

#### `/health`
Displays current bot health status and metrics.

**Example:**
```
/health
```

**Response:**
```
🟢 System Health: HEALTHY

⏰ Uptime: 2d 5h 30m
💾 Memory Usage: 145MB / 512MB (28%)

🗄️ Database: ✅ Connected (12ms)
🤖 Discord API: ✅ Connected (45ms, 150 guilds)

Monitoring: ✅ Enabled
```

**Degraded Status Example:**
```
🟡 System Health: DEGRADED

⏰ Uptime: 5h 20m
💾 Memory Usage: 420MB / 512MB (82%)

🗄️ Database: ✅ Connected (890ms)
🤖 Discord API: ✅ Connected (520ms, 150 guilds)

⚠️ Issues
• Memory usage high (>75%)
• Database response time slow (>1s)
• Discord latency high (>500ms)

Monitoring: ✅ Enabled
```

### Health Endpoint

External monitoring tools can check bot health via HTTP:

```bash
curl http://localhost:3000/api/health
```

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

**Response (Unhealthy):**
```json
{
  "success": false,
  "data": {
    "status": "unhealthy",
    "errors": [
      "Memory usage critical (>90%)",
      "Database connection failed"
    ]
  }
}
```

### Health Thresholds

| Metric | Degraded | Unhealthy |
|--------|----------|-----------|
| Memory Usage | >75% | >90% |
| Database Response | >1000ms | Disconnected |
| Discord Latency | >500ms | Disconnected |

### Automatic Monitoring

When enabled, health checks run every `HEALTH_CHECK_INTERVAL_MINUTES`:

- **Healthy**: Info log every check
- **Degraded**: Warning log with issues
- **Unhealthy**: Error log with critical issues

---

## 3. Graceful Shutdown System

### Features

- **Signal Handling**: Responds to SIGTERM, SIGINT, SIGQUIT
- **Operation Completion**: Waits for active operations to finish
- **Final Backup**: Creates backup before shutdown
- **Database Cleanup**: Properly closes all connections
- **Discord Cleanup**: Cleanly disconnects from Discord API
- **Timeout Protection**: Forces shutdown after 30 seconds if stuck
- **Error Handling**: Handles uncaught exceptions gracefully

### How It Works

When a shutdown signal is received:

1. **Stop New Operations**: Bot stops accepting new commands
2. **Wait for Active Tasks**: Waits up to 10 seconds for completion
3. **Create Final Backup**: Saves database state
4. **Close Database**: Flushes and closes all DB connections
5. **Disconnect Client**: Cleanly disconnects from Discord
6. **Exit**: Graceful exit with code 0

### Shutdown Signals

| Signal | Source | Behavior |
|--------|--------|----------|
| SIGTERM | Docker, systemd | Graceful shutdown |
| SIGINT | Ctrl+C | Graceful shutdown |
| SIGQUIT | Kill command | Graceful shutdown |
| Uncaught Exception | Code error | Immediate shutdown |

### Example Shutdown Log

```
[INFO] Received SIGTERM, initiating graceful shutdown...
[INFO] Starting graceful shutdown sequence...
[INFO] Step 1/5: Waiting for active operations to complete...
[INFO] No active operations to wait for
[INFO] Step 2/5: Creating final backup...
[SUCCESS] Backup created: manual_2025-12-04_15-45-30.db (12.5 MB)
[SUCCESS] Final backup created successfully
[INFO] Step 3/5: Closing database connections...
[INFO] Database connections closed
[INFO] Step 4/5: Disconnecting from Discord...
[INFO] Discord client disconnected
[INFO] Step 5/5: Cleanup complete
[SUCCESS] Shutdown completed successfully
```

### Force Shutdown

If graceful shutdown exceeds 30 seconds, the process is forcefully terminated:

```
[ERROR] Shutdown timeout exceeded, forcing exit
```

---

## Integration Examples

### Docker Compose

```yaml
services:
  osbot:
    image: osbot:latest
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    environment:
      - BACKUP_ENABLED=true
      - BACKUP_DIR=/app/backups
      - HEALTH_CHECK_ENABLED=true
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 1m
      timeout: 10s
      retries: 3
    stop_grace_period: 30s
```

### Systemd Service

```ini
[Unit]
Description=OSBot Discord Bot
After=network.target

[Service]
Type=simple
User=osbot
WorkingDirectory=/opt/osbot
ExecStart=/usr/bin/bun run /opt/osbot/dist/index.js
Restart=on-failure
RestartSec=10s
TimeoutStopSec=30

# Environment
Environment="NODE_ENV=production"
Environment="BACKUP_ENABLED=true"
Environment="HEALTH_CHECK_ENABLED=true"

[Install]
WantedBy=multi-user.target
```

### Monitoring with Uptime Kuma

Add HTTP(S) monitor:
- **URL**: `https://yourdomain.com/api/health`
- **Expected Status**: `200`
- **Interval**: 60 seconds
- **Retries**: 3

---

## Best Practices

### Backups

1. **Store backups on separate storage** from database
2. **Test restore process** regularly in non-production environment
3. **Monitor backup disk space** to prevent failures
4. **Adjust retention** based on your change frequency
5. **Create manual backup** before major updates

### Health Monitoring

1. **Enable in production** for early problem detection
2. **Integrate with alerting** (Discord webhook, email, etc.)
3. **Monitor trends** over time for capacity planning
4. **Set up external monitoring** for redundancy
5. **Review degraded states** to prevent issues

### Graceful Shutdown

1. **Always use signals** (SIGTERM/SIGINT) not SIGKILL
2. **Set appropriate timeout** in container orchestration
3. **Monitor shutdown logs** for stuck operations
4. **Test shutdown behavior** before production deployment
5. **Use process managers** that support graceful shutdown

---

## Troubleshooting

### Backup Issues

**Problem**: Backups not being created
- Check `BACKUP_ENABLED=true` in `.env`
- Verify write permissions on `BACKUP_DIR`
- Check disk space availability
- Review logs for errors

**Problem**: Restore failed
- Ensure backup file exists and is not corrupted
- Verify database is not locked by another process
- Check file permissions
- Try restoring to a different location first

### Health Check Issues

**Problem**: Always showing unhealthy
- Check database connection
- Verify Discord token is valid
- Review memory limits
- Check for resource constraints

**Problem**: Endpoint returns 500 error
- Ensure health monitoring is initialized
- Check for errors in application logs
- Verify health monitor is not in error state

### Shutdown Issues

**Problem**: Bot hangs during shutdown
- Check for infinite loops in active operations
- Review shutdown timeout setting
- Look for locked database connections
- Check for blocking I/O operations

**Problem**: Data loss on shutdown
- Ensure backups are enabled
- Verify database WAL mode is active
- Check that shutdown sequence completes
- Review application logs for errors

---

## Technical Details

### File Structure

```
src/
├── utils/
│   ├── backup-manager.ts      # Backup system
│   ├── health-monitor.ts      # Health monitoring
│   └── shutdown-handler.ts    # Graceful shutdown
├── commands/
│   └── utility/
│       ├── backup.ts           # Backup commands
│       └── health.ts           # Health command
├── config/
│   └── environment.ts          # Configuration
└── dashboard/
    └── routes/
        └── api.ts              # Health endpoint
```

### Database Format

Backups are SQLite database files with naming format:
- Manual: `manual_YYYY-MM-DDTHH-MM-SS.db`
- Automatic: `auto_YYYY-MM-DDTHH-MM-SS.db`

Includes:
- Main database file (`.db`)
- Write-Ahead Log file (`.db-wal`)
- Shared memory file (`.db-shm`)

### Health Metrics

```typescript
interface HealthMetrics {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connected: boolean;
    responseTime: number;
  };
  discord: {
    connected: boolean;
    ping: number;
    guilds: number;
  };
  errors: string[];
}
```

---

## Support

For issues or questions about these systems:

1. Check this documentation first
2. Review application logs
3. Check GitHub issues
4. Create new issue with:
   - System affected (backup/health/shutdown)
   - Steps to reproduce
   - Expected vs actual behavior
   - Log output
   - Environment details

---

## Version History

**v1.0.0** (2025-12-04)
- Initial release
- Database backup system
- Health monitoring
- Graceful shutdown handler
