import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { SubheadingH2 } from '@/components/ui/typography/subheading-h2';
import { SubheadingH3 } from '@/components/ui/typography/subheading-h3';
import { nodeToAnchorReference } from '@/utils/node-to-anchor-reference';
import { cn } from '@/utils/tailwindcss-override';
import type { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import type { ReactNode } from 'react';
import React from 'react';

/**
 * Converts a heading node to JSX.
 *
 * For H1 to H3, we replace the heading tags with our custom components.
 * For H4 to H6, we keep the original heading tags, i.e. raw h4, h5, h6 tags.
 *
 * @param node - The heading node to convert.
 *
 */
export const HeadingJSXConverter: JSXConverters<SerializedHeadingNode> = {
  heading: ({ node, nodesToJSX }) => {
    const children: ReactNode[] = nodesToJSX({
      nodes: node.children,
    });

    let NodeTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | React.FC = node.tag;

    // we replace the heading tags with our custom components
    switch (NodeTag) {
      case 'h1': {
        NodeTag = HeadlineH1;
        break;
      }
      case 'h2': {
        NodeTag = SubheadingH2;
        break;
      }
      case 'h3': {
        NodeTag = SubheadingH3;
        break;
      }
    }

    const format = node.format;
    return (
      <NodeTag
        className={cn(
          format === 'left' && 'text-left',
          format === 'center' && 'text-center',
          format === 'right' && 'text-right',
          format === 'justify' && 'text-justify',
        )}
        id={nodeToAnchorReference(children)}
      >
        {children}
      </NodeTag>
    );
  },
};
