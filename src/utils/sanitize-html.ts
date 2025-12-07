const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;'
};

export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

export function sanitizeEmbedData(embedData: any): any {
  if (!embedData || typeof embedData !== 'object') return {};

  const sanitized: any = {};

  if (embedData.title) {
    sanitized.title = escapeHtml(String(embedData.title)).substring(0, 256);
  }

  if (embedData.description) {
    sanitized.description = escapeHtml(String(embedData.description)).substring(0, 4096);
  }

  if (embedData.url) {
    const url = String(embedData.url);
    if (isValidUrl(url)) {
      sanitized.url = url.substring(0, 2048);
    }
  }

  if (embedData.color) {
    const color = String(embedData.color);
    if (/^#?[0-9A-Fa-f]{6}$/.test(color)) {
      sanitized.color = color.replace('#', '');
    }
  }

  if (embedData.timestamp) {
    sanitized.timestamp = embedData.timestamp;
  }

  if (embedData.footer) {
    sanitized.footer = {
      text: escapeHtml(String(embedData.footer.text || '')).substring(0, 2048)
    };
    if (embedData.footer.icon_url && isValidUrl(embedData.footer.icon_url)) {
      sanitized.footer.icon_url = String(embedData.footer.icon_url).substring(0, 2048);
    }
  }

  if (embedData.image) {
    if (embedData.image.url && isValidUrl(embedData.image.url)) {
      sanitized.image = {
        url: String(embedData.image.url).substring(0, 2048)
      };
    }
  }

  if (embedData.thumbnail) {
    if (embedData.thumbnail.url && isValidUrl(embedData.thumbnail.url)) {
      sanitized.thumbnail = {
        url: String(embedData.thumbnail.url).substring(0, 2048)
      };
    }
  }

  if (embedData.author) {
    sanitized.author = {
      name: escapeHtml(String(embedData.author.name || '')).substring(0, 256)
    };
    if (embedData.author.url && isValidUrl(embedData.author.url)) {
      sanitized.author.url = String(embedData.author.url).substring(0, 2048);
    }
    if (embedData.author.icon_url && isValidUrl(embedData.author.icon_url)) {
      sanitized.author.icon_url = String(embedData.author.icon_url).substring(0, 2048);
    }
  }

  if (Array.isArray(embedData.fields)) {
    sanitized.fields = embedData.fields.slice(0, 25).map((field: any) => ({
      name: escapeHtml(String(field.name || '')).substring(0, 256),
      value: escapeHtml(String(field.value || '')).substring(0, 1024),
      inline: Boolean(field.inline)
    }));
  }

  return sanitized;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
