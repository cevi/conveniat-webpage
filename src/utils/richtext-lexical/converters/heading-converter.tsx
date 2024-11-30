import { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { SerializedHeadingNode } from '@payloadcms/richtext-lexical';
import React, { ReactNode } from 'react';
import { HeadlineH1 } from '@/components/typography/headline-h1';
import { SubheadingH2 } from '@/components/typography/subheading-h2';
import { SubheadingH3 } from '@/components/typography/subheading-h3';

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

    return <NodeTag>{children}</NodeTag>;
  },
};
