CREATE TABLE IF NOT EXISTS guilds (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT DEFAULT '/',
    locale TEXT DEFAULT 'en',
    ticket_category_id TEXT,
    ticket_support_role_id TEXT,
    ticket_log_channel_id TEXT,
    welcome_channel_id TEXT,
    goodbye_channel_id TEXT,
    welcome_message TEXT DEFAULT 'Welcome {user} to {server}!',
    goodbye_message TEXT DEFAULT '{user} has left the server.',
    welcome_enabled BOOLEAN DEFAULT 1,
    goodbye_enabled BOOLEAN DEFAULT 1,
    auto_role_id TEXT,
    mod_log_channel_id TEXT,
    audit_log_channel_id TEXT,
    starboard_channel_id TEXT,
    starboard_threshold INTEGER DEFAULT 3,
    xp_enabled BOOLEAN DEFAULT 1,
    xp_min INTEGER DEFAULT 15,
    xp_max INTEGER DEFAULT 25,
    xp_cooldown INTEGER DEFAULT 60,
    level_up_channel_id TEXT,
    level_up_message TEXT DEFAULT 'Congratulations {user}! You reached level {level}!',
    level_up_enabled BOOLEAN DEFAULT 1,
    antiraid_enabled BOOLEAN DEFAULT 0,
    antiraid_join_threshold INTEGER DEFAULT 5,
    antiraid_join_window INTEGER DEFAULT 10,
    antiraid_action TEXT DEFAULT 'kick',
    warning_threshold_enabled BOOLEAN DEFAULT 0,
    warning_threshold_count INTEGER DEFAULT 3,
    warning_threshold_action TEXT DEFAULT 'mute',
    warning_threshold_duration INTEGER DEFAULT 3600,
    log_channel_id TEXT,
    log_message_edits BOOLEAN DEFAULT 0,
    log_message_deletes BOOLEAN DEFAULT 0,
    log_member_join BOOLEAN DEFAULT 0,
    log_member_leave BOOLEAN DEFAULT 0,
    log_role_changes BOOLEAN DEFAULT 0,
    log_voice_activity BOOLEAN DEFAULT 0,
    log_channel_events BOOLEAN DEFAULT 0,
    log_server_events BOOLEAN DEFAULT 0,
    log_role_events BOOLEAN DEFAULT 0,
    log_ban_events BOOLEAN DEFAULT 0,
    log_invite_events BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    username TEXT,
    level INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS guild_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    level INTEGER DEFAULT 0,
    xp INTEGER DEFAULT 0,
    messages INTEGER DEFAULT 0,
    warnings INTEGER DEFAULT 0,
    joined_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id)
);

CREATE TABLE IF NOT EXISTS rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    rule_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE(guild_id, rule_number)
);

CREATE TABLE IF NOT EXISTS warnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT,
    rule_id INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
    guild_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (guild_id, key),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS level_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    level INTEGER NOT NULL,
    role_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE(guild_id, level)
);

CREATE TABLE IF NOT EXISTS xp_cooldowns (
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    last_xp_gain INTEGER NOT NULL,
    PRIMARY KEY (user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT,
    channel_id TEXT NOT NULL,
    message TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS giveaways (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    prize TEXT NOT NULL,
    winner_count INTEGER NOT NULL,
    ends_at INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed BOOLEAN DEFAULT 0,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS polls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    question TEXT NOT NULL,
    options TEXT NOT NULL,
    ends_at INTEGER,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    completed BOOLEAN DEFAULT 0,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS automod_settings (
    guild_id TEXT PRIMARY KEY,
    spam_enabled BOOLEAN DEFAULT 0,
    spam_threshold INTEGER DEFAULT 5,
    spam_interval INTEGER DEFAULT 5,
    links_enabled BOOLEAN DEFAULT 0,
    links_whitelist TEXT,
    caps_enabled BOOLEAN DEFAULT 0,
    caps_threshold INTEGER DEFAULT 70,
    mentions_enabled BOOLEAN DEFAULT 0,
    mentions_threshold INTEGER DEFAULT 5,
    profanity_enabled BOOLEAN DEFAULT 0,
    profanity_list TEXT,
    invites_enabled BOOLEAN DEFAULT 0,
    invites_allow_own BOOLEAN DEFAULT 1,
    action TEXT DEFAULT 'warn',
    violations_threshold INTEGER DEFAULT 3,
    violations_action TEXT DEFAULT 'timeout',
    violations_duration INTEGER DEFAULT 300,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS automod_violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    violation_type TEXT NOT NULL,
    message_content TEXT,
    action_taken TEXT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    subject TEXT,
    status TEXT DEFAULT 'open',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    closed_at INTEGER,
    closed_by TEXT,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reaction_roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    emoji TEXT NOT NULL,
    role_id TEXT NOT NULL,
    UNIQUE(message_id, emoji),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    target_id TEXT,
    reason TEXT,
    details TEXT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS starboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    starboard_message_id TEXT,
    star_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    UNIQUE(guild_id, message_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    name TEXT NOT NULL,
    response TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    uses INTEGER DEFAULT 0,
    UNIQUE(guild_id, name),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_xp ON guild_members(guild_id, xp);
CREATE INDEX IF NOT EXISTS idx_rules_guild ON rules(guild_id);
CREATE INDEX IF NOT EXISTS idx_warnings_guild ON warnings(guild_id);
CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_commands_guild ON custom_commands(guild_id);
CREATE INDEX IF NOT EXISTS idx_level_roles_guild ON level_roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_reminders_time ON reminders(remind_at, completed);
CREATE INDEX IF NOT EXISTS idx_giveaways_time ON giveaways(ends_at, completed);
CREATE INDEX IF NOT EXISTS idx_polls_time ON polls(ends_at, completed);
CREATE INDEX IF NOT EXISTS idx_polls_guild ON polls(guild_id);
CREATE INDEX IF NOT EXISTS idx_automod_violations_guild ON automod_violations(guild_id);
CREATE INDEX IF NOT EXISTS idx_automod_violations_user ON automod_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_guild ON tickets(guild_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_reaction_roles_message ON reaction_roles(message_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_guild ON audit_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_moderator ON audit_logs(moderator_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_starboard_guild ON starboard(guild_id);
CREATE INDEX IF NOT EXISTS idx_starboard_message ON starboard(message_id);
CREATE INDEX IF NOT EXISTS idx_custom_commands_guild_name ON custom_commands(guild_id, name);

CREATE TABLE IF NOT EXISTS locked_nicknames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    locked_nickname TEXT NOT NULL,
    locked_by TEXT NOT NULL,
    locked_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_locked_nicknames_guild ON locked_nicknames(guild_id);
CREATE INDEX IF NOT EXISTS idx_locked_nicknames_user ON locked_nicknames(guild_id, user_id);

-- Temporary bans table
CREATE TABLE IF NOT EXISTS tempbans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT,
    banned_at INTEGER DEFAULT (strftime('%s', 'now')),
    expires_at INTEGER NOT NULL,
    unbanned BOOLEAN DEFAULT 0,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE(guild_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tempbans_guild ON tempbans(guild_id);
CREATE INDEX IF NOT EXISTS idx_tempbans_expiry ON tempbans(expires_at, unbanned);

-- Cases table for unified moderation tracking
CREATE TABLE IF NOT EXISTS cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    case_number INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    moderator_id TEXT NOT NULL,
    reason TEXT,
    duration INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE(guild_id, case_number)
);

CREATE INDEX IF NOT EXISTS idx_cases_guild ON cases(guild_id);
CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(guild_id, user_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_number ON cases(guild_id, case_number);

-- Invite tracking table
CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    invite_code TEXT NOT NULL,
    inviter_id TEXT,
    uses INTEGER DEFAULT 0,
    max_uses INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    UNIQUE(guild_id, invite_code)
);

CREATE INDEX IF NOT EXISTS idx_invites_guild ON invites(guild_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);

-- Member invites tracking (who invited whom)
CREATE TABLE IF NOT EXISTS member_invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    inviter_id TEXT,
    invite_code TEXT,
    joined_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_invites_guild ON member_invites(guild_id);
CREATE INDEX IF NOT EXISTS idx_member_invites_user ON member_invites(guild_id, user_id);

CREATE TABLE IF NOT EXISTS console_logs (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_console_logs_timestamp ON console_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_console_logs_level ON console_logs(level);

CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    action_id TEXT,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    moderator_id TEXT,
    moderator_reason TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appeal_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appeal_id INTEGER NOT NULL,
    moderator_id TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (appeal_id) REFERENCES appeals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS analytics_cache (
    guild_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    time_bucket INTEGER NOT NULL,
    value INTEGER NOT NULL,
    metadata TEXT,
    PRIMARY KEY (guild_id, metric_type, time_bucket),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bulk_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    executor_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    target_count INTEGER NOT NULL,
    success_count INTEGER NOT NULL,
    failed_count INTEGER NOT NULL,
    reason TEXT,
    metadata TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS backups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    backup_name TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    size_bytes INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    includes TEXT NOT NULL,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_appeals_guild ON appeals(guild_id);
CREATE INDEX IF NOT EXISTS idx_appeals_user ON appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_appeals_status ON appeals(guild_id, status);
CREATE INDEX IF NOT EXISTS idx_appeal_notes_appeal ON appeal_notes(appeal_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_guild ON analytics_cache(guild_id);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_time ON analytics_cache(guild_id, metric_type, time_bucket);
CREATE INDEX IF NOT EXISTS idx_bulk_actions_guild ON bulk_actions(guild_id);
CREATE INDEX IF NOT EXISTS idx_bulk_actions_executor ON bulk_actions(executor_id);
CREATE INDEX IF NOT EXISTS idx_backups_guild ON backups(guild_id);

CREATE TABLE IF NOT EXISTS dashboard_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT,
    discriminator TEXT,
    action_type TEXT NOT NULL,
    guild_id TEXT,
    guild_name TEXT,
    resource TEXT,
    method TEXT,
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    success BOOLEAN DEFAULT 1,
    error_message TEXT,
    timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_dashboard_audit_user ON dashboard_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_guild ON dashboard_audit(guild_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_action ON dashboard_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_timestamp ON dashboard_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_dashboard_audit_user_guild ON dashboard_audit(user_id, guild_id);
