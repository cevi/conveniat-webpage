/**
 * Extract the rails authenticity token from input value
 */
export function extractAuthenticityToken(html: string): string {
  // Find the input tag with name="authenticity_token"
  const tagMatch = html.match(/<input[^>]*name="authenticity_token"[^>]*>/);
  if (tagMatch === null) return '';

  const valueMatch = tagMatch[0].match(/value="([^"]+)"/);
  return valueMatch?.[1] ?? '';
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
