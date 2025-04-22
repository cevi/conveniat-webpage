import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import type { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';

/**
 * Converts a paragraph node to JSX.
 */
export const ParagraphJSXConverter: JSXConverters<SerializedParagraphNode> = {
  paragraph: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children,
    });

    if (children.length === 0) {
      return <></>;
    }

    return <ParagraphText>{children}</ParagraphText>;
  },
};
