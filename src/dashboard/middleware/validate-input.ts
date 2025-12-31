import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

const ALLOWED_GUILD_CONFIG_FIELDS = new Set([
  'prefix',
  'locale',
  'ticket_category_id',
  'ticket_support_role_id',
  'ticket_log_channel_id',
  'ticket_open_message',
  'ticket_close_message',
  'ticket_dm_message',
  'ticket_open_embed',
  'ticket_close_embed',
  'ticket_dm_embed',
  'ticket_dm_transcript',
  'ticket_max_open',
  'ticket_naming_format',
  'welcome_channel_id',
  'goodbye_channel_id',
  'welcome_message',
  'goodbye_message',
  'welcome_embed',
  'goodbye_embed',
  'welcome_enabled',
  'goodbye_enabled',
  'auto_role_id',
  'mod_log_channel_id',
  'audit_log_channel_id',
  'starboard_channel_id',
  'starboard_threshold',
  'xp_enabled',
  'xp_min',
  'xp_max',
  'xp_cooldown',
  'level_up_channel_id',
  'level_up_message',
  'level_up_enabled',
  'antiraid_enabled',
  'antiraid_join_threshold',
  'antiraid_join_window',
  'antiraid_action',
  'warning_threshold_enabled',
  'warning_threshold_count',
  'warning_threshold_action',
  'warning_threshold_duration',
  'log_channel_id',
  'log_message_edits',
  'log_message_deletes',
  'log_member_join',
  'log_member_leave',
  'log_role_changes',
  'log_voice_activity',
  'log_channel_events',
  'log_server_events',
  'log_role_events',
  'log_ban_events',
  'log_invite_events',
  'tickets_enabled',
  'warnings_enabled',
  'analytics_enabled',
  'moderation_enabled',
  'automod_enabled',
  'leveling_enabled',
  'music_enabled'
]);

const ALLOWED_AUTOMOD_FIELDS = new Set([
  'enabled',
  'spam_enabled',
  'spam_threshold',
  'spam_interval',
  'spam_similarity_enabled',
  'spam_similarity_threshold',
  'links_enabled',
  'links_whitelist',
  'caps_enabled',
  'caps_threshold',
  'caps_min_length',
  'mentions_enabled',
  'mentions_threshold',
  'profanity_enabled',
  'profanity_list',
  'profanity_preset',
  'profanity_use_word_boundaries',
  'invites_enabled',
  'invites_allow_own',
  'invites_allowlist',
  'action',
  'violations_enabled',
  'violations_threshold',
  'violations_duration',
  'violations_action',
  'exempt_roles',
  'exempt_channels',
  'log_channel_id',
  'phishing_enabled',
  'phishing_action',
  'account_age_enabled',
  'account_age_min_days',
  'account_age_action',
  'alt_detection_enabled',
  'alt_detection_sensitivity',
  'alt_detection_action'
]);

const ALLOWED_RULE_FIELDS = new Set([
  'title',
  'description'
]);

interface ValidationSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'array';
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: any[];
  };
}

const GUILD_CONFIG_SCHEMA: ValidationSchema = {
  prefix: { type: 'string', maxLength: 10 },
  locale: { type: 'string', maxLength: 10, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ },
  ticket_category_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  ticket_support_role_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  ticket_log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  ticket_open_message: { type: 'string', maxLength: 2000 },
  ticket_close_message: { type: 'string', maxLength: 2000 },
  ticket_dm_message: { type: 'string', maxLength: 2000 },
  ticket_open_embed: { type: 'string', maxLength: 10000 },
  ticket_close_embed: { type: 'string', maxLength: 10000 },
  ticket_dm_embed: { type: 'string', maxLength: 10000 },
  ticket_dm_transcript: { type: 'boolean' },
  ticket_max_open: { type: 'number', min: 1, max: 10 },
  ticket_naming_format: { type: 'string', enum: ['username', 'number'] },
  welcome_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  goodbye_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  welcome_message: { type: 'string', maxLength: 2000 },
  goodbye_message: { type: 'string', maxLength: 2000 },
  welcome_embed: { type: 'string', maxLength: 10000 },
  goodbye_embed: { type: 'string', maxLength: 10000 },
  welcome_enabled: { type: 'boolean' },
  goodbye_enabled: { type: 'boolean' },
  auto_role_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  mod_log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  audit_log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  starboard_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  starboard_threshold: { type: 'number', min: 1, max: 100 },
  xp_enabled: { type: 'boolean' },
  xp_min: { type: 'number', min: 1, max: 1000 },
  xp_max: { type: 'number', min: 1, max: 1000 },
  xp_cooldown: { type: 'number', min: 0, max: 3600 },
  level_up_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  level_up_message: { type: 'string', maxLength: 2000 },
  level_up_enabled: { type: 'boolean' },
  antiraid_enabled: { type: 'boolean' },
  antiraid_join_threshold: { type: 'number', min: 1, max: 50 },
  antiraid_join_window: { type: 'number', min: 1, max: 60 },
  antiraid_action: { type: 'string', enum: ['kick', 'ban'] },
  warning_threshold_enabled: { type: 'boolean' },
  warning_threshold_count: { type: 'number', min: 1, max: 20 },
  warning_threshold_action: { type: 'string', enum: ['mute', 'kick', 'ban'] },
  warning_threshold_duration: { type: 'number', min: 0, max: 2592000 },
  log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d*$/ },
  log_message_edits: { type: 'boolean' },
  log_message_deletes: { type: 'boolean' },
  log_member_join: { type: 'boolean' },
  log_member_leave: { type: 'boolean' },
  log_role_changes: { type: 'boolean' },
  log_voice_activity: { type: 'boolean' },
  log_channel_events: { type: 'boolean' },
  log_server_events: { type: 'boolean' },
  log_role_events: { type: 'boolean' },
  log_ban_events: { type: 'boolean' },
  log_invite_events: { type: 'boolean' },
  tickets_enabled: { type: 'boolean' },
  warnings_enabled: { type: 'boolean' },
  analytics_enabled: { type: 'boolean' },
  moderation_enabled: { type: 'boolean' },
  automod_enabled: { type: 'boolean' },
  leveling_enabled: { type: 'boolean' },
  music_enabled: { type: 'boolean' }
};

const AUTOMOD_SCHEMA: ValidationSchema = {
  enabled: { type: 'boolean' },
  spam_enabled: { type: 'boolean' },
  spam_threshold: { type: 'number', min: 3, max: 10 },
  spam_interval: { type: 'number', min: 3, max: 30 },
  spam_similarity_enabled: { type: 'boolean' },
  spam_similarity_threshold: { type: 'number', min: 50, max: 100 },
  links_enabled: { type: 'boolean' },
  links_whitelist: { type: 'string', maxLength: 5000 },
  caps_enabled: { type: 'boolean' },
  caps_threshold: { type: 'number', min: 50, max: 100 },
  caps_min_length: { type: 'number', min: 5, max: 100 },
  mentions_enabled: { type: 'boolean' },
  mentions_threshold: { type: 'number', min: 3, max: 20 },
  profanity_enabled: { type: 'boolean' },
  profanity_list: { type: 'string', maxLength: 10000 },
  profanity_preset: { type: 'string', enum: ['strict', 'moderate', 'slurs_only', 'custom', 'off'] },
  profanity_use_word_boundaries: { type: 'boolean' },
  invites_enabled: { type: 'boolean' },
  invites_allow_own: { type: 'boolean' },
  invites_allowlist: { type: 'string', maxLength: 1000 },
  action: { type: 'string', enum: ['delete', 'warn', 'timeout', 'kick', 'ban'] },
  violations_enabled: { type: 'boolean' },
  violations_threshold: { type: 'number', min: 0, max: 10 },
  violations_duration: { type: 'number', min: 1, max: 604800 },
  violations_action: { type: 'string', enum: ['warn', 'timeout', 'kick', 'ban'] },
  exempt_roles: { type: 'string', maxLength: 1000 },
  exempt_channels: { type: 'string', maxLength: 1000 },
  log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  phishing_enabled: { type: 'boolean' },
  phishing_action: { type: 'string', enum: ['warn', 'delete', 'timeout', 'kick', 'ban'] },
  account_age_enabled: { type: 'boolean' },
  account_age_min_days: { type: 'number', min: 1, max: 365 },
  account_age_action: { type: 'string', enum: ['kick', 'ban'] },
  alt_detection_enabled: { type: 'boolean' },
  alt_detection_sensitivity: { type: 'number', min: 1, max: 5 },
  alt_detection_action: { type: 'string', enum: ['warn', 'kick', 'ban'] }
};

const RULE_SCHEMA: ValidationSchema = {
  title: { type: 'string', required: true, minLength: 1, maxLength: 256 },
  description: { type: 'string', required: true, minLength: 1, maxLength: 2000 }
};

function validateField(fieldName: string, value: any, schema: ValidationSchema): string | null {
  const rules = schema[fieldName];
  if (!rules) return null;

  if (value === undefined || value === null) {
    if (rules.required) {
      return `${fieldName} is required`;
    }
    return null;
  }

  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== rules.type) {
    return `${fieldName} must be of type ${rules.type}`;
  }

  if (rules.type === 'string') {
    const str = value as string;
    if (rules.minLength !== undefined && str.length < rules.minLength) {
      return `${fieldName} must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength !== undefined && str.length > rules.maxLength) {
      return `${fieldName} must be at most ${rules.maxLength} characters`;
    }
    if (rules.pattern && !rules.pattern.test(str)) {
      return `${fieldName} has invalid format`;
    }
  }

  if (rules.type === 'number') {
    const num = value as number;
    if (rules.min !== undefined && num < rules.min) {
      return `${fieldName} must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && num > rules.max) {
      return `${fieldName} must be at most ${rules.max}`;
    }
  }

  if (rules.enum && !rules.enum.includes(value)) {
    return `${fieldName} must be one of: ${rules.enum.join(', ')}`;
  }

  return null;
}

function validateBody(body: any, allowedFields: Set<string>, schema: ValidationSchema): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      errors.push(`Field '${key}' is not allowed`);
      continue;
    }

    const error = validateField(key, body[key], schema);
    if (error) {
      errors.push(error);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function validateGuildConfig(req: Request, res: Response, next: NextFunction) {
  const { valid, errors } = validateBody(req.body, ALLOWED_GUILD_CONFIG_FIELDS, GUILD_CONFIG_SCHEMA);

  if (!valid) {
    logger.warn(`Invalid guild config update attempted - Errors: ${JSON.stringify(errors)}, Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: errors
    });
  }

  next();
}

export function validateAutomod(req: Request, res: Response, next: NextFunction) {
  const { valid, errors } = validateBody(req.body, ALLOWED_AUTOMOD_FIELDS, AUTOMOD_SCHEMA);

  if (!valid) {
    logger.warn(`Invalid automod config update attempted - Errors: ${JSON.stringify(errors)}, Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: errors
    });
  }

  next();
}

export function validateRule(req: Request, res: Response, next: NextFunction) {
  const { valid, errors } = validateBody(req.body, ALLOWED_RULE_FIELDS, RULE_SCHEMA);

  if (!valid) {
    logger.warn(`Invalid rule creation attempted - Errors: ${JSON.stringify(errors)}, Body: ${JSON.stringify(req.body)}`);
    return res.status(400).json({
      success: false,
      error: 'Invalid input',
      details: errors
    });
  }

  next();
}
