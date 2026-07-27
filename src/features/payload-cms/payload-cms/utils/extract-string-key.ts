/**
 * Safely extracts a plain string key from a value that may be a string,
 * a localized dictionary object (e.g. { de: "M2", en: "M2" }), or a key object ({ key: "M2" }).
 */
export function extractStringKey(rawKey: unknown, locale?: string): string | undefined {
  if (typeof rawKey === 'string') {
    const trimmed = rawKey.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (rawKey !== null && typeof rawKey === 'object') {
    const record = rawKey as Record<string, unknown>;

    // 1. Try matching specified locale (e.g. record['de'])
    if (locale !== undefined) {
      const locValue = record[locale];
      if (typeof locValue === 'string') {
        const trimmed = locValue.trim();
        if (trimmed.length > 0) return trimmed;
      }
    }

    // 2. Try explicit property names 'key' or 'value'
    const keyValue = record['key'];
    if (typeof keyValue === 'string') {
      const trimmed = keyValue.trim();
      if (trimmed.length > 0) return trimmed;
    }

    const valValue = record['value'];
    if (typeof valValue === 'string') {
      const trimmed = valValue.trim();
      if (trimmed.length > 0) return trimmed;
    }

    // 3. Fallback: return the first non-empty string property found in the object
    for (const val of Object.values(record)) {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.length > 0) return trimmed;
      }
    }
  }

  return undefined;
}
