import type { Locale } from '@/types/types';
import type {
  SerializedEditorState,
  SerializedLexicalNode,
} from '@payloadcms/richtext-lexical/lexical';
import type { BasePayload } from 'payload';

interface LinkNode extends SerializedLexicalNode {
  fields?: {
    linkType?: string;
    doc?: {
      value: string | object;
      relationTo: string;
    };
  };
  children?: SerializedLexicalNode[];
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
  const linksToResolve: Array<{ node: LinkNode }> = [];

  const walk = (nodes: SerializedLexicalNode[]): void => {
    for (const node of nodes) {
      const linkNode = node as unknown as LinkNode;
      if (
        (linkNode.type === 'link' || linkNode.type === 'autolink') &&
        linkNode.fields?.linkType === 'internal' &&
        typeof linkNode.fields.doc?.value === 'string'
      ) {
        linksToResolve.push({ node: linkNode });
      }
      if (linkNode.children) {
        walk(linkNode.children);
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
          collection: documentInfo.relationTo as never,
          id: documentInfo.value,
          depth: 1,
          locale,
          fallbackLocale: false,
        });

        // Inject the fetched document back into the node
        documentInfo.value = fetchedDocument;
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
export async function resolveLinksInArray<T extends { description?: SerializedEditorState }>(
  items: T[],
  payload: BasePayload,
  locale: Locale,
): Promise<T[]> {
  await Promise.all(
    items.map(async (item) => {
      if (item.description) {
        await resolveRichTextLinks(item.description, payload, locale);
      }
    }),
  );
  return items;
}
