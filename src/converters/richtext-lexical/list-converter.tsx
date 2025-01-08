import { SerializedListItemNode, SerializedListNode } from '@payloadcms/richtext-lexical';
import { JSXConverters } from '@payloadcms/richtext-lexical/react';

export const ListItemJSXConverter: JSXConverters<SerializedListItemNode> = {
  listitem: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children,
    });

    return (
      <li className="max-w-2xl text-left font-body text-base font-normal text-gray-500">
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

    return <NodeTag>{children}</NodeTag>;
  },
};
