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

/**
 * Extracts a pending manuelle Freigabe request from the group members HTML page.
 * Returns the group name and url if found, otherwise undefined.
 */
export function extractPendingApprovalGroup(
  html: string,
): { groupName: string; groupUrl: string } | undefined {
  const rowMatch = html.match(/<tr id="person_add_request_\d+">[\s\S]*?<\/tr>/);
  if (rowMatch === null) return undefined;

  const rowHtml = rowMatch[0];
  const linkMatch = rowHtml.match(/<a href="(\/groups\/\d+)">([^<]+)<\/a>/);
  if (linkMatch === null) return undefined;

  return {
    groupUrl: linkMatch[1] ?? '',
    groupName: linkMatch[2]?.trim() ?? '',
  };
}
