import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';

const ALLOWED_GUILD_CONFIG_FIELDS = new Set([
  'locale',
  'log_channel_id',
  'welcome_channel_id',
  'welcome_message',
  'goodbye_message',
  'level_up_channel_id',
  'level_up_message',
  'mod_role_id',
  'mute_role_id',
  'ticket_category_id',
  'ticket_log_channel_id',
  'ticket_support_role_id',
  'auto_role_enabled',
  'auto_role_id'
]);

const ALLOWED_AUTOMOD_FIELDS = new Set([
  'enabled',
  'spam_enabled',
  'spam_threshold',
  'links_enabled',
  'caps_enabled',
  'caps_threshold',
  'mentions_enabled',
  'mentions_threshold',
  'profanity_enabled',
  'profanity_words',
  'invites_enabled',
  'violations_enabled',
  'violations_threshold',
  'violations_duration',
  'violations_action',
  'exempt_roles',
  'exempt_channels',
  'log_channel_id'
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
  locale: { type: 'string', maxLength: 10, pattern: /^[a-z]{2}(-[A-Z]{2})?$/ },
  log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  welcome_channel_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  welcome_message: { type: 'string', maxLength: 2000 },
  goodbye_message: { type: 'string', maxLength: 2000 },
  level_up_channel_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  level_up_message: { type: 'string', maxLength: 2000 },
  mod_role_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  mute_role_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  ticket_category_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  ticket_log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  ticket_support_role_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ },
  auto_role_enabled: { type: 'boolean' },
  auto_role_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ }
};

const AUTOMOD_SCHEMA: ValidationSchema = {
  enabled: { type: 'boolean' },
  spam_enabled: { type: 'boolean' },
  spam_threshold: { type: 'number', min: 1, max: 100 },
  links_enabled: { type: 'boolean' },
  caps_enabled: { type: 'boolean' },
  caps_threshold: { type: 'number', min: 1, max: 100 },
  mentions_enabled: { type: 'boolean' },
  mentions_threshold: { type: 'number', min: 1, max: 100 },
  profanity_enabled: { type: 'boolean' },
  profanity_words: { type: 'string', maxLength: 10000 },
  invites_enabled: { type: 'boolean' },
  violations_enabled: { type: 'boolean' },
  violations_threshold: { type: 'number', min: 1, max: 100 },
  violations_duration: { type: 'number', min: 1, max: 86400 },
  violations_action: { type: 'string', enum: ['kick', 'ban', 'mute'] },
  exempt_roles: { type: 'string', maxLength: 1000 },
  exempt_channels: { type: 'string', maxLength: 1000 },
  log_channel_id: { type: 'string', maxLength: 20, pattern: /^\d+$/ }
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
