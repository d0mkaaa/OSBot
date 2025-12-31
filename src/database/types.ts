export interface Guild {
  guild_id: string;
  prefix: string | null;
  welcome_channel_id: string | null;
  goodbye_channel_id: string | null;
  welcome_message: string | null;
  goodbye_message: string | null;
  welcome_enabled: number;
  goodbye_enabled: number;
  auto_role_id: string | null;
  mod_log_channel_id: string | null;
  audit_log_channel_id: string | null;
  starboard_channel_id: string | null;
  starboard_threshold: number;
  xp_enabled: number;
  xp_min: number;
  xp_max: number;
  xp_cooldown: number;
  level_up_channel_id: string | null;
  level_up_message: string | null;
  level_up_enabled: number;
  antiraid_enabled: number;
  antiraid_join_threshold: number;
  antiraid_join_window: number;
  antiraid_action: string | null;
  raid_lockdown_active: number;
  raid_lockdown_started_at: number | null;
  raid_lockdown_verification_channel_id: string | null;
  warning_threshold_enabled: number;
  warning_threshold_count: number;
  warning_threshold_action: string | null;
  warning_threshold_duration: number | null;
  log_channel_id: string | null;
  log_message_edits: number;
  log_message_deletes: number;
  log_member_join: number;
  log_member_leave: number;
  log_role_changes: number;
  log_voice_activity: number;
  log_channel_events: number;
  log_server_events: number;
  log_role_events: number;
  log_ban_events: number;
  log_invite_events: number;
  created_at: number;
  updated_at: number;
}

export interface User {
  user_id: string;
  username: string;
  created_at: number;
}

export interface GuildMember {
  guild_id: string;
  user_id: string;
  level: number;
  xp: number;
  messages: number;
  warnings: number;
  joined_at: number;
}

export interface Warning {
  id: number;
  guild_id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  rule_id: number | null;
  created_at: number;
  rule_number?: number;
  rule_title?: string;
}

export interface Case {
  id: number;
  guild_id: string;
  case_number: number;
  action_type: string;
  user_id: string;
  moderator_id: string;
  reason: string | null;
  duration: number | null;
  created_at: number;
}

export interface Rule {
  id: number;
  guild_id: string;
  rule_number: number;
  title: string;
  description: string;
  created_at: number;
  updated_at: number;
}

export interface LockedNickname {
  guild_id: string;
  user_id: string;
  locked_nickname: string;
  locked_by: string;
  locked_at: number;
}

export interface Tempban {
  guild_id: string;
  user_id: string;
  moderator_id: string;
  expires_at: number;
  reason: string | null;
  unbanned: number;
  created_at: number;
}

export interface LevelRole {
  guild_id: string;
  level: number;
  role_id: string;
  created_at: number;
}

export interface Reminder {
  id: number;
  user_id: string;
  guild_id: string | null;
  channel_id: string;
  message: string;
  remind_at: number;
  completed: number;
  created_at: number;
}

export interface Giveaway {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  prize: string;
  winner_count: number;
  ends_at: number;
  completed: number;
  created_by: string;
  created_at: number;
}

export interface Poll {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  question: string;
  options: string;
  ends_at: number | null;
  completed: number;
  created_by: string;
  created_at: number;
}

export interface AutomodSettings {
  guild_id: string;
  spam_enabled: number;
  spam_threshold: number;
  spam_interval: number;
  links_enabled: number;
  links_whitelist: string | null;
  caps_enabled: number;
  caps_threshold: number;
  mentions_enabled: number;
  mentions_threshold: number;
  profanity_enabled: number;
  profanity_list: string | null;
  invites_enabled: number;
  invites_allow_own: number;
  action: string;
  violations_threshold: number;
  violations_action: string | null;
  violations_duration: number | null;
  created_at: number;
  updated_at: number;
}

export interface AutomodViolation {
  id: number;
  guild_id: string;
  user_id: string;
  violation_type: string;
  message_content: string;
  action_taken: string;
  timestamp: number;
}

export interface Ticket {
  id: number;
  guild_id: string;
  channel_id: string;
  user_id: string;
  subject: string | null;
  status: string;
  created_at: number;
  closed_at: number | null;
  closed_by: string | null;
}

export interface ReactionRole {
  id: number;
  guild_id: string;
  message_id: string;
  channel_id: string;
  emoji: string;
  role_id: string;
  created_at: number;
}

export interface AuditLog {
  id: number;
  guild_id: string;
  action_type: string;
  moderator_id: string;
  target_id: string | null;
  reason: string | null;
  details: string | null;
  timestamp: number;
}

export interface StarboardEntry {
  guild_id: string;
  message_id: string;
  channel_id: string;
  author_id: string;
  star_count: number;
  starboard_message_id: string | null;
  created_at: number;
}

export interface CustomCommand {
  id: number;
  guild_id: string;
  name: string;
  response: string;
  created_by: string;
  uses: number;
  created_at: number;
}

export interface XPCooldown {
  guild_id: string;
  user_id: string;
  last_xp_gain: number;
}

export interface Invite {
  guild_id: string;
  invite_code: string;
  inviter_id: string | null;
  uses: number;
  max_uses: number | null;
  last_update: number;
}

export interface MemberInvite {
  guild_id: string;
  user_id: string;
  inviter_id: string | null;
  invite_code: string | null;
  joined_at: number;
}

export interface MusicSettings {
  guild_id: string;
  dj_role_id: string | null;
  volume: number;
  loop_mode: string;
  auto_leave: number;
  auto_leave_timeout: number;
  twentyfour_seven: number;
  vote_skip_enabled: number;
  vote_skip_threshold: number;
  max_queue_size: number;
  max_track_duration: number;
  auto_delete_files: number;
  auto_delete_delay: number;
  enabled: number;
}

export interface MusicQueue {
  guild_id: string;
  tracks: string;
  current_track: string | null;
  volume: number;
  loop_mode: string;
  is_playing: number;
  updated_at: number;
}

export interface CommandRestriction {
  guild_id: string;
  enabled: number;
  blacklisted_channels: string | null;
  exception_roles: string | null;
  exception_permissions: string | null;
}

export interface AltDetectionScore {
  id: number;
  guild_id: string;
  user_id: string;
  score: number;
  flags: string | null;
  created_at: number;
}
