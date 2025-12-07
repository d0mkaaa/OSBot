import { EmbedBuilder } from 'discord.js';

interface PlaceholderValues {
  user?: string;
  userTag?: string;
  userAvatar?: string;
  server?: string;
  subject?: string;
  closer?: string;
  closerTag?: string;
  [key: string]: string | undefined;
}

export function buildCustomEmbed(embedConfig: any, placeholders: PlaceholderValues): EmbedBuilder {
  const embed = new EmbedBuilder();

  if (embedConfig.author) {
    let authorName = embedConfig.author.name || '';
    let authorIcon = embedConfig.author.iconURL || '';

    authorName = replacePlaceholders(authorName, placeholders);
    authorIcon = replacePlaceholders(authorIcon, placeholders);

    if (authorName) {
      embed.setAuthor({ name: authorName, iconURL: authorIcon || undefined });
    }
  }

  if (embedConfig.title) {
    const title = replacePlaceholders(embedConfig.title, placeholders);
    embed.setTitle(title);
  }

  if (embedConfig.description) {
    const description = replacePlaceholders(embedConfig.description, placeholders);
    embed.setDescription(description);
  }

  if (embedConfig.color) {
    embed.setColor(parseInt(embedConfig.color.replace('#', ''), 16));
  }

  if (embedConfig.thumbnail?.url) {
    const thumbnailUrl = replacePlaceholders(embedConfig.thumbnail.url, placeholders);
    embed.setThumbnail(thumbnailUrl);
  }

  if (embedConfig.image?.url) {
    const imageUrl = replacePlaceholders(embedConfig.image.url, placeholders);
    embed.setImage(imageUrl);
  }

  if (embedConfig.fields && embedConfig.fields.length > 0) {
    const fields = embedConfig.fields.map((field: any) => ({
      name: replacePlaceholders(field.name, placeholders),
      value: replacePlaceholders(field.value, placeholders),
      inline: field.inline || false
    }));
    embed.addFields(fields);
  }

  if (embedConfig.footer) {
    let footerText = embedConfig.footer.text || '';
    let footerIcon = embedConfig.footer.iconURL || '';

    footerText = replacePlaceholders(footerText, placeholders);
    footerIcon = replacePlaceholders(footerIcon, placeholders);

    if (footerText) {
      embed.setFooter({ text: footerText, iconURL: footerIcon || undefined });
    }
  }

  if (embedConfig.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}

function replacePlaceholders(text: string, placeholders: PlaceholderValues): string {
  let result = text;

  if (placeholders.user) {
    result = result.replace(/{user}/g, placeholders.user);
  }
  if (placeholders.userTag) {
    result = result.replace(/{userTag}/g, placeholders.userTag);
  }
  if (placeholders.userAvatar) {
    result = result.replace(/{userAvatar}/g, placeholders.userAvatar);
  }
  if (placeholders.server) {
    result = result.replace(/{server}/g, placeholders.server);
  }
  if (placeholders.subject) {
    result = result.replace(/{subject}/g, placeholders.subject);
  }
  if (placeholders.closer) {
    result = result.replace(/{closer}/g, placeholders.closer);
  }
  if (placeholders.closerTag) {
    result = result.replace(/{closerTag}/g, placeholders.closerTag);
  }

  result = result.replace(/\\n/g, '\n');

  return result;
}
