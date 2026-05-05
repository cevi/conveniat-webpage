import { LinkComponent } from '@/components/ui/link-component';
import { ParagraphText } from '@/components/ui/typography/paragraph-text';
import { cn } from '@/utils/tailwindcss-override';
import type { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { isValidElement } from 'react';

const LEADING_PUNCTUATION_PATTERN = /^[.,;:!?]/;

/**
 * Converts a paragraph node to JSX.
 */
export const ParagraphJSXConverter: JSXConverters<SerializedParagraphNode> = {
  paragraph: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children,
    });
    const normalizedChildren = Array.isArray(children) ? children : [children];

    const format = node.format;
    const paddingInlineStart =
      typeof node.indent === 'number' && node.indent > 0 ? `${node.indent * 2}rem` : undefined;

    if (normalizedChildren.length === 0) {
      return (
        <ParagraphText
          className={cn(
            format === 'left' && 'text-left',
            format === 'center' && 'text-center text-balance',
            format === 'right' && 'text-right',
            format === 'justify' && 'text-justify',
          )}
          style={{ paddingInlineStart }}
        >
          <br />
        </ParagraphText>
      );
    }

    const childrenWithLinkedPunctuation = normalizedChildren.flatMap((child, index) => {
      // fix for punctuation being separated from links when they are directly adjacent in the text, e.g. "This is a [link](url)."
      // see https://github.com/cevi/conveniat-webpage/issues/1134
      if (index === normalizedChildren.length - 1) {
        return [child];
      }

      const nextChild = normalizedChildren[index + 1];
      if (!isValidElement(child)) {
        return [child];
      }

      if (child.type !== LinkComponent) {
        return [child];
      }

      if (typeof nextChild !== 'string' || !LEADING_PUNCTUATION_PATTERN.test(nextChild)) {
        return [child];
      }

      return [child, '\u2060'];
    });

    return (
      <ParagraphText
        className={cn(
          format === 'left' && 'text-left',
          format === 'center' && 'text-center text-balance',
          format === 'right' && 'text-right',
          format === 'justify' && 'text-justify',
        )}
        style={{ paddingInlineStart }}
      >
        {childrenWithLinkedPunctuation}
      </ParagraphText>
    );
  },
};
