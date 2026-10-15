import DOMPurify from 'dompurify';

const ALLOWED_TAGS = [
  'b', 'i', 'u', 'strong', 'em', 'br', 'p', 'span', 'div',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'a', 'blockquote', 'code', 'pre',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class', 'id'];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export function sanitizeText(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

export function sanitizeUrl(url: string): string {
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  
  try {
    const parsedUrl = new URL(url);
    if (!allowedProtocols.includes(parsedUrl.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

export function sanitizeInput(input: string, maxLength: number = 10000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();
  
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  sanitized = sanitizeText(sanitized);

  return sanitized;
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidJson(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  maxDepth: number = 5
): T {
  if (maxDepth <= 0) {
    return {} as T;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeText(key);

    if (value === null || value === undefined) {
      sanitized[sanitizedKey] = value;
    } else if (typeof value === 'string') {
      sanitized[sanitizedKey] = sanitizeInput(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[sanitizedKey] = value;
    } else if (Array.isArray(value)) {
      sanitized[sanitizedKey] = value.map((item) =>
        typeof item === 'string' ? sanitizeInput(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>, maxDepth - 1) :
        item
      );
    } else if (typeof value === 'object') {
      sanitized[sanitizedKey] = sanitizeObject(value as Record<string, unknown>, maxDepth - 1);
    } else {
      sanitized[sanitizedKey] = String(value);
    }
  }

  return sanitized as T;
}

export default {
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeInput,
  escapeRegExp,
  isValidJson,
  sanitizeObject,
};
