/**
 *
 * Recursively extracts field names and labels from a nested data structure.
 * This is useful for crawling Payload CMS form structures or any nested object
 * containing field definitions.
 *
 */
export interface ExtractedField {
  label: string;
  value: string;
}

export const extractFields = (
  data: unknown,
  fields: ExtractedField[] = [],
  visited = new Set<unknown>(),
): ExtractedField[] => {
  // Prevent infinite loops on circular references
  if (typeof data === 'object' && data !== null) {
    if (visited.has(data)) return fields;
    visited.add(data);
  }

  if (Array.isArray(data)) {
    for (const item of data) {
      extractFields(item, fields, visited);
    }
  } else if (typeof data === 'object' && data !== null) {
    const item = data as Record<string, unknown>;

    // We check for 'name' and often 'blockType' or 'type' in Payload forms
    const name = item['name'];
    if (typeof name === 'string' && name !== '') {
      const label = item['label'];
      fields.push({
        label: typeof label === 'string' ? label : name,
        value: name,
      });
    }

    // Recursively search all children
    for (const val of Object.values(item)) {
      if (typeof val === 'object' && val !== null) {
        extractFields(val, fields, visited);
      }
    }
  }

  return fields;
};
