import type { Locale } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type { BasePayload } from 'payload';

interface LinkNode {
  type: string;
  fields?: {
    linkType?: string;
    doc?: {
      value: string | any;
      relationTo: string;
    };
  };
  children?: any[];
}

/**
 * Recursively resolves internal links in Lexical rich text that have depth 0 (only ID).
 * This ensures that the client bundle doesn't need to resolve these links itself.
 */
export async function resolveRichTextLinks(
  richText: SerializedEditorState,
  payload: BasePayload,
  locale: Locale,
): Promise<SerializedEditorState> {
  if (!richText || !richText.root || !richText.root.children) {
    return richText;
  }

  const linksToResolve: Array<{ node: LinkNode }> = [];

  const walk = (nodes: any[]): void => {
    for (const node of nodes) {
      if (
        (node.type === 'link' || node.type === 'autolink') &&
        node.fields?.linkType === 'internal' &&
        typeof node.fields.doc?.value === 'string'
      ) {
        linksToResolve.push({ node: node as LinkNode });
      }
      if (node.children) {
        walk(node.children as any[]);
      }
    }
  };

  walk(richText.root.children);

  if (linksToResolve.length === 0) {
    return richText;
  }

  // Resolve all links in parallel
  await Promise.all(
    linksToResolve.map(async ({ node }) => {
      const documentInfo = node.fields?.doc;
      if (!documentInfo || typeof documentInfo.value !== 'string') return;

      try {
        const fetchedDocument = await payload.findByID({
          collection: documentInfo.relationTo as any,
          id: documentInfo.value,
          depth: 1,
          locale,
          fallbackLocale: false,
        });

        if (fetchedDocument) {
          // Inject the fetched document back into the node
          documentInfo.value = fetchedDocument;
        }
      } catch (error) {
        console.error(
          `Failed to resolve link for ${documentInfo.relationTo}:${documentInfo.value}`,
          error,
        );
      }
    }),
  );

  return richText;
}

/**
 * Utility to resolve links in an array of objects that have a description field.
 */
export async function resolveLinksInArray<T extends { description?: any }>(
  items: T[],
  payload: BasePayload,
  locale: Locale,
): Promise<T[]> {
  await Promise.all(
    items.map(async (item) => {
      if (item.description) {
        await resolveRichTextLinks(item.description as SerializedEditorState, payload, locale);
      }
    }),
  );
  return items;
}
