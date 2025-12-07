# 🌍 Localization System Documentation

Complete guide for the OSBot multi-language support system using TypeScript + Bun + discord.js v14.

---

## 📑 Table of Contents

1. [Overview](#overview)
2. [Supported Languages](#supported-languages)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [Adding Localization to Commands](#adding-localization-to-commands)
6. [Translation File Structure](#translation-file-structure)
7. [Advanced Features](#advanced-features)
8. [Automation Tools](#automation-tools)
9. [Adding a New Language](#adding-a-new-language)
10. [Best Practices](#best-practices)
11. [API Reference](#api-reference)

---

## Overview

The localization system provides seamless multi-language support across all bot commands and features. It supports:

- **Auto-detection** of user's Discord language preference
- **Per-server** locale settings
- **Fallback** to English if translations are missing
- **Parameter replacement** for dynamic content
- **Number & date formatting** based on locale
- **Pluralization** support

### System Files

```
src/
├── locales/
│   ├── en.json          # English (default)
│   ├── es.json          # Spanish
│   └── fr.json          # French
├── utils/
│   ├── i18n.ts          # Core translation engine
│   ├── locale-helper.ts # Helper to get user locale
│   └── locale-manager.ts# Advanced locale management
└── scripts/
    ├── localize-commands.ts    # Analyze localization status
    └── add-localization.ts     # Auto-inject localization
```

---

## Supported Languages

| Code | Language | Native Name | Status |
|------|----------|-------------|--------|
| `en` | English | English | ✅ Complete |
| `es` | Spanish | Español | ✅ Complete |
| `fr` | French | Français | 🚧 In Progress |

---

## Quick Start

### For Users

**Set server language:**
```
/config locale <language>
```

**Available languages:**
- English (`en`)
- Spanish (`es`)
- French (`fr`)

The bot will automatically use your Discord language if your server hasn't set a specific language.

### For Developers

**1. Add imports to your command:**
```typescript
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';
```

**2. Get user's locale:**
```typescript
async execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getInteractionLocale(interaction);

  // Use locale for translations...
}
```

**3. Replace hardcoded strings:**
```typescript
// Before
await interaction.reply('✅ User has been banned!');

// After
await interaction.reply(t('commands.ban.success', locale, { user: user.tag }));
```

**4. Add translations to locale files:**
```json
{
  "commands": {
    "ban": {
      "success": "✅ User **{user}** has been banned!"
    }
  }
}
```

---

## Architecture

### Flow Diagram

```
User runs command
       ↓
getInteractionLocale(interaction)
       ↓
Check guild locale setting in database
       ↓
Fallback to user's Discord locale
       ↓
Load translations from locales/{locale}.json
       ↓
Replace parameters {param} in translation
       ↓
Return localized string
```

### Core Components

#### 1. **i18n.ts** - Translation Engine

Main translation system that:
- Loads JSON locale files
- Caches translations in memory
- Supports nested keys (dot notation)
- Handles parameter replacement
- Falls back to English if key missing

```typescript
import { i18n } from './utils/i18n.js';

const translation = i18n.translate('commands.ping.pong', 'es', {
  latency: '42',
  api: '35'
});
```

#### 2. **locale-helper.ts** - Locale Detection

Determines user's locale:
1. Check server's configured locale in database
2. Fallback to user's Discord language preference
3. Default to English

```typescript
import { getInteractionLocale } from './utils/locale-helper.js';

const locale = getInteractionLocale(interaction);
```

#### 3. **locale-manager.ts** - Advanced Management

Provides utilities for:
- Setting/getting guild locale
- Validating locale codes
- Formatting numbers, dates, currency
- Relative time formatting
- Pluralization

```typescript
import { LocaleManager } from './utils/locale-manager.ts';

LocaleManager.setGuildLocale(guildId, 'es');
const formatted = LocaleManager.formatNumber(1234567, 'fr'); // "1 234 567"
```

---

## Adding Localization to Commands

### Step-by-Step Example

Let's localize the `/kick` command:

**1. Original Code (src/commands/moderation/kick.ts):**
```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

const command = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a user from the server'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.reply('✅ User has been kicked!');
  }
};

export default command;
```

**2. Add Imports:**
```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command = {
  // ...
```

**3. Get Locale:**
```typescript
async execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const locale = getInteractionLocale(interaction);

  await interaction.reply(t('commands.kick.success', locale));
}
```

**4. Add to en.json:**
```json
{
  "commands": {
    "kick": {
      "success": "✅ User has been kicked!",
      "cannot_kick_self": "❌ You cannot kick yourself!",
      "no_permission": "❌ You don't have permission to kick members!"
    }
  }
}
```

**5. Add to es.json:**
```json
{
  "commands": {
    "kick": {
      "success": "✅ ¡El usuario ha sido expulsado!",
      "cannot_kick_self": "❌ ¡No puedes expulsarte a ti mismo!",
      "no_permission": "❌ ¡No tienes permiso para expulsar miembros!"
    }
  }
}
```

**6. Add to fr.json:**
```json
{
  "commands": {
    "kick": {
      "success": "✅ L'utilisateur a été expulsé!",
      "cannot_kick_self": "❌ Vous ne pouvez pas vous expulser vous-même!",
      "no_permission": "❌ Vous n'avez pas la permission d'expulser des membres!"
    }
  }
}
```

---

## Translation File Structure

### Nested Object Structure

Translations are organized in nested objects using dot notation:

```json
{
  "common": {
    "errors": {
      "guild_only": "❌ This command can only be used in a server!"
    },
    "success": "✅ Success!"
  },
  "commands": {
    "commandName": {
      "message": "Translation text",
      "fields": {
        "fieldName": "Field value"
      }
    }
  }
}
```

**Accessing translations:**
```typescript
t('common.errors.guild_only', locale)           // "❌ This command..."
t('commands.ban.success', locale)                // Command-specific
t('commands.userinfo.fields.username', locale)   // Nested field
```

### Parameter Replacement

Use `{paramName}` for dynamic values:

```json
{
  "commands": {
    "ban": {
      "success": "✅ Banned **{user}** for {reason}"
    }
  }
}
```

```typescript
t('commands.ban.success', locale, {
  user: 'JohnDoe#1234',
  reason: 'Spamming'
});
```

### Common Patterns

**Error Messages:**
```json
{
  "common": {
    "errors": {
      "guild_only": "❌ This command can only be used in a server!",
      "no_permission": "❌ You don't have permission!",
      "user_not_found": "❌ User not found!"
    }
  }
}
```

**Command Structure:**
```json
{
  "commands": {
    "commandName": {
      "name": "commandName",
      "description": "Command description",
      "options": {
        "optionName": "Option description"
      },
      "success": "✅ Success message",
      "error": "❌ Error message",
      "cannot_execute": "❌ Cannot execute",
      "not_found": "❌ Not found"
    }
  }
}
```

---

## Advanced Features

### 1. Number Formatting

```typescript
import { LocaleManager } from './utils/locale-manager.js';

LocaleManager.formatNumber(1234567, 'en');  // "1,234,567"
LocaleManager.formatNumber(1234567, 'fr');  // "1 234 567"
LocaleManager.formatNumber(1234567, 'es');  // "1.234.567"
```

### 2. Date Formatting

```typescript
const date = new Date();

LocaleManager.formatDate(date, 'en', { dateStyle: 'full' });
// "Monday, November 30, 2025"

LocaleManager.formatDate(date, 'fr', { dateStyle: 'full' });
// "lundi 30 novembre 2025"
```

### 3. Currency Formatting

```typescript
LocaleManager.formatCurrency(99.99, 'USD', 'en');  // "$99.99"
LocaleManager.formatCurrency(99.99, 'EUR', 'fr');  // "99,99 €"
LocaleManager.formatCurrency(99.99, 'EUR', 'es');  // "99,99 €"
```

### 4. Relative Time

```typescript
const timestamp = Date.now() + (2 * 60 * 60 * 1000); // 2 hours from now

LocaleManager.formatRelativeTime(timestamp, 'en');  // "in 2 hours"
LocaleManager.formatRelativeTime(timestamp, 'es');  // "dentro de 2 horas"
LocaleManager.formatRelativeTime(timestamp, 'fr');  // "dans 2 heures"
```

### 5. Pluralization

```typescript
LocaleManager.pluralize(1, 'commands.clear.messages', 'en');
// Uses "commands.clear.messages.singular"

LocaleManager.pluralize(5, 'commands.clear.messages', 'en');
// Uses "commands.clear.messages.plural"
```

---

## Automation Tools

### 1. Analyze Localization Status

Check which commands are localized:

```bash
bun run scripts/localize-commands.ts
```

**Output:**
```
🌍 Discord Bot Localization Analyzer

📊 Localization Statistics:
  Total commands: 43
  Localized commands: 5
  Unlocalized commands: 38
  Progress: 12%

⚠️  Commands needing localization:
  1. /src/commands/fun/roll.ts
  2. /src/commands/fun/choose.ts
  ...
```

### 2. Analyze Specific Command

Find hardcoded strings in a command:

```bash
bun run scripts/localize-commands.ts --analyze src/commands/fun/roll.ts
```

**Output:**
```
📝 Analyzing src/commands/fun/roll.ts...

Found 3 strings:
  1. "🎲 You rolled a **6** (1-6)"
  2. "❌ Invalid dice size!"
  3. "⚠️ Dice must have at least 2 sides"
```

### 3. Auto-Inject Localization (Dry Run)

Preview changes without applying:

```bash
bun run scripts/add-localization.ts src/commands/fun/roll.ts
```

**Output:**
```
🌍 Localization Injector
Mode: DRY RUN

📝 Processing: src/commands/fun/roll.ts
  🔧 Adding imports...
  🔧 Adding locale getter...
  📌 Found 3 hardcoded strings:
     1. "🎲 You rolled a **6** (1-6)"
     2. "❌ Invalid dice size!"
     3. "⚠️ Dice must have at least 2 sides"
  ℹ️  Dry run - no changes made

💡 Run with --apply to actually make changes
```

### 4. Apply Localization

Actually inject localization code:

```bash
bun run scripts/add-localization.ts src/commands/fun/roll.ts --apply
```

---

## Adding a New Language

### Step 1: Create Locale File

Create a new JSON file in `src/locales/`:

```bash
touch src/locales/de.json
```

### Step 2: Copy Template

Copy the English locale as a base:

```json
{
  "common": {
    "errors": {
      "guild_only": "❌ Dieser Befehl kann nur auf einem Server verwendet werden!",
      "no_permission": "❌ Du hast keine Berechtigung für diesen Befehl!"
    },
    "success": "✅ Erfolg!",
    "loading": "⏳ Verarbeitung...",
    "cancelled": "❌ Abgebrochen."
  },
  "commands": {
    "ping": {
      "name": "ping",
      "description": "Überprüfe die Latenz des Bots",
      "pong": "🏓 Pong! Latenz: {latency}ms | API-Latenz: {api}ms"
    }
  }
}
```

### Step 3: Register in locale-manager.ts

Add to `SUPPORTED_LOCALES`:

```typescript
export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English', emoji: '🇺🇸' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', emoji: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', emoji: '🇩🇪' },
];
```

### Step 4: Add Discord Locale Mapping (Optional)

Map Discord's locale codes in `locale-manager.ts`:

```typescript
static mapDiscordLocale(discordLocale: string): string {
  const mapping: Record<string, string> = {
    'en-US': 'en',
    'en-GB': 'en',
    'es-ES': 'es',
    'fr': 'fr',
    'de': 'de',
  };

  return mapping[discordLocale] || 'en';
}
```

### Step 5: Translate Commands

Translate all command strings in your new locale file. Use the English version as reference.

---

## Best Practices

### 1. Translation Keys

**✅ Good:**
```
commands.ban.success
commands.ban.cannot_ban_self
commands.ban.dm_message
```

**❌ Bad:**
```
ban_success
ban1
message
```

### 2. Parameter Names

**✅ Good:**
```json
{
  "success": "Banned **{user}** for {reason}"
}
```

**❌ Bad:**
```json
{
  "success": "Banned **{0}** for {1}"
}
```

### 3. Reuse Common Strings

**✅ Good:**
```typescript
t('common.errors.no_permission', locale)
t('common.success', locale)
```

**❌ Bad:**
Creating duplicate translations for the same message across different commands.

### 4. Keep Formatting

Preserve Discord markdown in all languages:

```json
{
  "en": "**{user}** has been banned!",
  "es": "**{user}** ha sido baneado!",
  "fr": "**{user}** a été banni!"
}
```

### 5. Test All Paths

Ensure every code path is localized:
- Success messages
- Error messages
- Permission checks
- Not found errors
- DM messages
- Embed titles/fields

---

## API Reference

### i18n Module

**`i18n.translate(key, locale, params)`**
- `key`: Translation key (e.g., 'commands.ping.pong')
- `locale`: Language code ('en', 'es', 'fr')
- `params`: Optional object for parameter replacement
- Returns: Translated string

**`t(key, locale, params)`**
- Shorthand for `i18n.translate()`
- Returns: `string` (arrays are automatically joined with newlines)

**`ta(key, locale)`**
- Get translation as array (for lists, multiple options, etc.)
- `key`: Translation key (e.g., 'commands.8ball.responses')
- `locale`: Optional language code
- Returns: `string[]` (if translation is a string, wraps it in an array)

### locale-helper Module

**`getInteractionLocale(interaction)`**
- Gets locale for a Discord interaction
- Checks guild setting → user locale → default 'en'
- Returns: Locale code string

### LocaleManager Class

**Static Methods:**

**`getGuildLocale(guildId: string): string`**
- Get configured locale for a guild
- Returns guild's locale or 'en'

**`setGuildLocale(guildId: string, locale: string): boolean`**
- Set locale for a guild
- Validates locale code
- Returns success status

**`isValidLocale(locale: string): boolean`**
- Check if locale code is supported
- Returns true/false

**`getAvailableLocales(): LocaleConfig[]`**
- Get list of all supported locales
- Returns array of locale configs

**`mapDiscordLocale(discordLocale: string): string`**
- Map Discord locale codes to bot locales
- Returns mapped locale code

**`formatNumber(num: number, locale: string): string`**
- Format number using locale rules
- Returns formatted string

**`formatDate(date: Date, locale: string, options?): string`**
- Format date using locale rules
- Returns formatted date string

**`formatCurrency(amount: number, currency: string, locale: string): string`**
- Format currency amount
- Returns formatted currency string

**`formatRelativeTime(timestamp: number, locale: string): string`**
- Format relative time (e.g., "2 hours ago")
- Returns formatted time string

**`pluralize(count: number, key: string, locale: string): string`**
- Handle pluralization
- Returns singular or plural translation

---

## Examples

### Example 1: Simple Command

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const command = {
  data: new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Say hello'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const locale = getInteractionLocale(interaction);
    await interaction.reply(t('commands.hello.greeting', locale, {
      user: interaction.user.username
    }));
  }
};

export default command;
```

### Example 2: Embed with Localization

```typescript
import { EmbedBuilder } from 'discord.js';
import { getInteractionLocale } from '../../utils/locale-helper.js';
import { t } from '../../utils/i18n.js';

const locale = getInteractionLocale(interaction);

const embed = new EmbedBuilder()
  .setTitle(t('commands.userinfo.title', locale))
  .setDescription(t('commands.userinfo.description', locale, { user: user.tag }))
  .addFields(
    {
      name: t('commands.userinfo.fields.username', locale),
      value: user.username
    },
    {
      name: t('commands.userinfo.fields.id', locale),
      value: user.id
    }
  );

await interaction.reply({ embeds: [embed] });
```

### Example 3: Conditional Messages

```typescript
const locale = getInteractionLocale(interaction);

if (!member) {
  return interaction.reply(t('common.errors.user_not_found', locale));
}

if (!member.kickable) {
  return interaction.reply(t('commands.kick.bot_higher_role', locale));
}

await member.kick();
await interaction.reply(t('commands.kick.success', locale, {
  user: member.user.tag
}));
```

### Example 4: Using Arrays with `ta()`

For translations that contain arrays (like random responses), use `ta()`:

```typescript
import { ta } from '../../utils/i18n.js';

const locale = getInteractionLocale(interaction);
const responses = ta('commands.8ball.responses', locale);
const response = responses[Math.floor(Math.random() * responses.length)];

await interaction.reply(`🎱 **${question}**\n\n*${response}*`);
```

**Translation file (en.json):**
```json
{
  "commands": {
    "8ball": {
      "responses": [
        "Yes, definitely",
        "It is certain",
        "Without a doubt",
        "Don't count on it",
        "My reply is no",
        "Very doubtful"
      ]
    }
  }
}
```

---

## Troubleshooting

### Translation Not Found

**Error:** `Translation key not found: commands.test.message`

**Solution:** Add the key to all locale files:
```json
{
  "commands": {
    "test": {
      "message": "Test message"
    }
  }
}
```

### Locale Not Loading

**Error:** `Failed to load locale: es`

**Solution:** Ensure locale file exists:
```bash
ls src/locales/es.json
```

### Parameters Not Replacing

**Problem:** Output shows `{user}` instead of username

**Solution:** Pass parameters object:
```typescript
t('commands.ban.success', locale, { user: 'JohnDoe' })
```

---

## Contributing Translations

Want to add a new language or improve existing translations?

1. Fork the repository
2. Create a new locale file or edit existing one
3. Follow the translation key structure
4. Test with the bot
5. Submit a pull request

**Translation Guidelines:**
- Keep emojis consistent
- Maintain markdown formatting
- Use natural, conversational language
- Test all parameter replacements
- Follow cultural conventions for your language

---

## License

This localization system is part of OSBot and follows the same license.

---

**Last Updated:** November 2025
**Version:** 1.0.0
