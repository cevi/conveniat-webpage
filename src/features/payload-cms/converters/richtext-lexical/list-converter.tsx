import type { SerializedListItemNode, SerializedListNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';

export const ListItemJSXConverter: JSXConverters<SerializedListItemNode> = {
  listitem: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children,
    });

    return (
      <li className="font-body max-w-2xl text-left text-base font-normal text-gray-500">
        {children}
      </li>
    );
  },
};

export const ListJSXConverter: JSXConverters<SerializedListNode> = {
  list: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children,
    });

    const NodeTag: 'ul' | 'ol' = node.tag;

    return <NodeTag className="ml-6 list-disc">{children}</NodeTag>;
  },
};
