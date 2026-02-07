/**
 * Extract the rails authenticity token from input value
 */
export function extractAuthenticityToken(html: string): string {
  const match = html.match(/<input type="hidden" name="authenticity_token" value="([^"]+)"/);
  return match ? (match[1] ?? '') : '';
}

/**
 * Extract the csrf token from meta tag
 */
export function extractCsrfMetaToken(html: string): string {
  const match = html.match(/<meta name="csrf-token" content="([^"]+)"/);
  return match ? (match[1] ?? '') : '';
}

/**
 * Extract all input fields from a form to preserve state
 */
export function extractFormFields(html: string): Record<string, string> {
  const fields: Record<string, string> = {};
  // Simple regex to find input values. For a robust solution, use node-html-parser.
  // We'll stick to regex for now to avoid large dependencies if not already presnet,
  // or better: use node-html-parser if available (checked in package.json).
  // Prototype used node-html-parser. Let's assume we can use regex for hidden fields for now
  // or assume node-html-parser matches.

  // Actually, let's wait for package.json check before committing to implementation details of this function.
  // But to be efficient, I'll implement a simple regex version or placeholder first,
  // then upgrade if node-html-parser is confirmed.

  const inputs = html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g);
  for (const match of inputs) {
    if (match[1] && match[2] !== undefined) {
      fields[match[1]] = match[2];
    }
  }
  return fields;
}

export function extractParticipationIdFromUrl(url: string): string | undefined {
  const match = url.match(/\/participations\/(\d+)/);
  return match ? (match[1] ?? undefined) : undefined;
}
