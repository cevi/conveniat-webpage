import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import { cn } from '@/utils/tailwindcss-override';
import type { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import type {
  SerializedElementNode,
  SerializedLexicalNode,
  Spread,
} from '@payloadcms/richtext-lexical/lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';

type SerializedBiggerParagraphNode<T extends SerializedLexicalNode = SerializedLexicalNode> =
  Spread<
    {
      textFormat: number;
      type: 'biggerParagraph';
    },
    SerializedElementNode<T>
  >;

/**
 * Converts a paragraph node to JSX.
 */
export const BiggerParagraphJSXConverter: JSXConverters<SerializedBiggerParagraphNode> = {
  biggerParagraph: ({ node, nodesToJSX }) => {
    // we assume that the biggerParagraph node is a SerializedParagraphNode
    const typedNode = node as unknown as SerializedParagraphNode;

    const children = nodesToJSX({
      nodes: typedNode.children,
    });

    if (children.length === 0) {
      return <></>;
    }

    const format = typedNode.format;

    return (
      <ParagraphText
        className={cn(
          'my-8 text-xl font-bold text-gray-500',
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
