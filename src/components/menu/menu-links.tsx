import { LinkComponent } from '@/components/ui/link-component';
import { cn } from '@/utils/tailwindcss-override';
import { OctagonAlert } from 'lucide-react';
import type React from 'react';

/** An entry of the main menu at any depth, as `processMenuTree` resolves it. */
export interface MenuNode {
  id: string;
  label: string;
  hasLink: boolean;
  hasPerm: boolean;
  isVisible: boolean;
  itemLink?: string | undefined;
  openInNewTab: boolean;
  subMenu?: MenuNode[] | undefined;
}

/** The visible entries below `node`: the hidden ones too in the preview, where they are marked. */
export const visibleChildren = (
  node: { subMenu?: MenuNode[] | undefined },
  showPreview: boolean,
): MenuNode[] => (node.subMenu ?? []).filter((child) => child.isVisible || showPreview);

/**
 * The label of an entry: a link where it has one, the label alone where it has none, and in the
 * preview a marked label where its target is gone or not visible to the reader.
 */
export const MenuEntryLabel: React.FC<{
  node: MenuNode;
  className: string;
  isCurrent?: boolean;
  /** drawn in front of the label, like the dot of a link */
  leading?: React.ReactNode;
}> = ({ node, className, isCurrent = false, leading }) => {
  if (!node.hasLink) {
    return (
      <span className={className}>
        {leading}
        <span>{node.label}</span>
      </span>
    );
  }

  if (!node.hasPerm) {
    return (
      <span className={cn(className, 'text-gray-500')}>
        {leading}
        <span>
          {node.label}
          <OctagonAlert aria-hidden className="text-danger ml-2 inline size-4 align-[-2px]" />
        </span>
      </span>
    );
  }

  return (
    <LinkComponent
      href={node.itemLink ?? '/'}
      openInNewTab={node.openInNewTab}
      prefetch
      aria-current={isCurrent ? 'page' : undefined}
      className={cn('closeNavOnClick', className)}
    >
      {leading}
      <span>{node.label}</span>
    </LinkComponent>
  );
};

/**
 * The entries below a column of the menu, down to the fourth level. A plain entry is a link with a
 * dot on its first line, so a label that wraps keeps its dot in place (#1479). An entry with
 * entries below it is a group: its label, then its own links behind a line.
 */
export const MenuLinks: React.FC<{
  nodes: MenuNode[];
  showPreview: boolean;
  isCurrent?: (node: MenuNode) => boolean;
  depth?: number;
}> = ({ nodes, showPreview, isCurrent = (): boolean => false, depth = 2 }) => (
  <ul className="flex flex-col gap-0.5">
    {nodes.map((node) => {
      const children = visibleChildren(node, showPreview);

      if (children.length > 0) {
        return (
          <li key={node.id} className="mt-2 first:mt-0">
            <MenuEntryLabel
              node={node}
              isCurrent={isCurrent(node)}
              className={cn(
                'text-heading block rounded-lg px-3 py-2 font-semibold',
                depth === 2 ? 'text-[15px]' : 'text-[14px]',
                node.hasLink && 'hover:bg-tint',
              )}
            />
            <div className="border-line ml-3 border-l pl-2">
              <MenuLinks
                nodes={children}
                showPreview={showPreview}
                isCurrent={isCurrent}
                depth={depth + 1}
              />
            </div>
          </li>
        );
      }

      const current = isCurrent(node);
      return (
        <li key={node.id}>
          <MenuEntryLabel
            node={node}
            isCurrent={current}
            leading={
              <span
                aria-hidden
                className={cn(
                  'mt-[0.5lh] size-1.5 shrink-0 -translate-y-1/2 rounded-full',
                  current
                    ? 'bg-conveniat-green'
                    : 'bg-rail-node group-hover/link:bg-conveniat-green',
                )}
              />
            }
            className={cn(
              'group/link flex items-start gap-2.5 rounded-lg px-3 py-2 leading-snug',
              depth === 2 ? 'text-[15px] text-gray-700' : 'text-[14px] text-green-700',
              node.hasLink && 'hover:bg-tint hover:text-heading',
              current && 'bg-tint text-heading font-semibold',
            )}
          />
        </li>
      );
    })}
  </ul>
);
