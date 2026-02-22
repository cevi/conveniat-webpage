import type { CollectionBeforeChangeHook } from 'payload';

export const extractEmailLinksHook: CollectionBeforeChangeHook = ({ data }) => {
  const ids = new Set<string>();

  if (Array.isArray(data['emails'])) {
    const jsonString = JSON.stringify(data['emails']);
    // Find internal link payload lexical nodes or just any 24-char hex strings
    // In lexical, doc id is typically inside {"relationTo": "generic-page", "value": "ID"}
    // This simple match will reliably find all valid ObjectIDs
    const regex = /"value":"([a-f0-9]{24})"/gi;
    let match;
    while ((match = regex.exec(jsonString)) !== null) {
      if (typeof match[1] === 'string') {
        ids.add(match[1]);
      }
    }
  }

  // Assign the unique IDs to the hidden field
  data['emailReferencedIds'] = [...ids];

  return data;
};
