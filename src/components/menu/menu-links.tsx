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
}> = ({ node, className, isCurrent = false }) => {
  if (!node.hasLink) {
    return (
      <span className={className}>
        <span>{node.label}</span>
      </span>
    );
  }

  if (!node.hasPerm) {
    return (
      <span className={cn(className, 'text-gray-500')}>
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
      <span>{node.label}</span>
    </LinkComponent>
  );
};

/**
 * The entries below a column of the menu, down to the fourth level. A plain entry is a link; an
 * entry with entries below it is a group: a small label like a `SectionLabel`, its own links
 * indented below it. Deeper levels step down in size and colour instead of adding marks.
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
          <li key={node.id}>
            <MenuEntryLabel
              node={node}
              isCurrent={isCurrent(node)}
              className={cn(
                'block rounded-xl px-3',
                depth === 2
                  ? 'font-heading pt-4 pb-1 text-[12px] font-extrabold tracking-[0.07em] text-green-500 uppercase'
                  : 'pt-2.5 pb-0.5 text-[14px] font-bold text-green-700',
                node.hasLink && 'hover:text-heading',
              )}
            />
            <div className="pl-3">
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
            className={cn(
              'flex min-h-[44px] items-center rounded-xl px-3 py-2 leading-snug',
              depth === 2 && 'text-heading text-[16px] font-semibold',
              depth === 3 && 'text-[15px] font-medium text-green-700',
              depth > 3 && 'text-[14px] font-medium text-green-500',
              node.hasLink && 'hover:bg-tint',
              current && 'bg-conveniat-green hover:bg-conveniat-green text-white',
            )}
          />
        </li>
      );
    })}
  </ul>
);
