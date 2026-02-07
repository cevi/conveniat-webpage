/**
 * Extract the rails authenticity token from input value
 */
export function extractAuthenticityToken(html: string): string {
  const match = html.match(/<input type="hidden" name="authenticity_token" value="([^"]+)"/);
  if (match === null) return '';
  return match[1] ?? '';
}

/**
 * Extract the csrf token from meta tag
 */
export function extractCsrfMetaToken(html: string): string {
  const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  if (match === null) return '';
  return match[1] ?? '';
}

/**
 * Extract all input fields from a form to preserve state
 */
export function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};

  const inputs = html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g);
  for (const match of inputs) {
    if (match[1] !== undefined && match[2] !== undefined) {
      fields[match[1]] = match[2];
    }
  }
  return fields;
}
