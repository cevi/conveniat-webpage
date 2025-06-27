import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import { cn } from '@/utils/tailwindcss-override';
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

    const format = node.format;

    return (
      <ParagraphText
        className={cn(
          format === 'left' && 'text-left',
          format === 'center' && 'text-center text-balance',
          format === 'right' && 'text-right',
          format === 'justify' && 'text-justify',
        )}
      >
        {children}
      </ParagraphText>
    );
  },
};
