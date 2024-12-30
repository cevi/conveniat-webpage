import { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import Link from 'next/link';

export const LinkJSXConverter: JSXConverters<SerializedParagraphNode> = {
  link: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({ nodes: node.children });

    return (
      <Link href={node?.fields?.['url'] ?? ''} className="font-bold text-cevi-red">
        {children}
      </Link>
    );
  },
};
