import { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { SerializedParagraphNode } from '@payloadcms/richtext-lexical';
import Link from 'next/link';

/**
 * Converts a link node to JSX.
 *
 * TODO: here the types are not correct, thus we disable the eslint rules
 *
 */
export const LinkJSXConverter: JSXConverters<SerializedParagraphNode> = {
  link: ({ node, nodesToJSX }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
    const children = nodesToJSX({ nodes: node.children });

    return (
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
      <Link href={node.fields?.['url'] ?? ''} className="font-extrabold text-cevi-red">
        {children}
      </Link>
    );
  },
};
