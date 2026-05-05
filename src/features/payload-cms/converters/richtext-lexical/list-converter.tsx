import { cn } from '@/utils/tailwindcss-override';
import type { SerializedListItemNode, SerializedListNode } from '@payloadcms/richtext-lexical';
import type { JSXConverters } from '@payloadcms/richtext-lexical/react';
import { CheckSquare, Square } from 'lucide-react';

export const ListItemJSXConverter: JSXConverters<SerializedListItemNode> = {
  listitem: ({ node, nodesToJSX }) => {
    const children = nodesToJSX({
      nodes: node.children,
    });

    if (node.checked !== undefined) {
      const Icon = node.checked ? CheckSquare : Square;
      return (
        <li className="font-body my-1 flex max-w-2xl items-start gap-2 text-left text-base font-normal text-gray-500">
          <Icon
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              node.checked ? 'text-primary' : 'text-gray-400',
            )}
            aria-hidden="true"
          />
          <div>{children}</div>
        </li>
      );
    }

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
    const listType = node.listType;

    return (
      <NodeTag
        className={cn(
          'my-2 ml-6',
          listType === 'number' && 'list-decimal',
          listType === 'check' && 'list-none',
          listType === 'bullet' && 'list-disc',
        )}
      >
        {children}
      </NodeTag>
    );
  },
};
