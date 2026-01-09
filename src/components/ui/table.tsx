import { cn } from '@/utils/tailwindcss-override';
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { forwardRef } from 'react';

const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, reference) => (
    <div className="relative w-full overflow-auto">
      <table
        ref={reference}
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  ),
);
Table.displayName = 'Table';

const TableHeader = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, reference) => (
    <thead
      ref={reference}
      className={cn(
        'text-muted-foreground border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50',
        className,
      )}
      {...props}
    />
  ),
);
TableHeader.displayName = 'TableHeader';

const TableBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, reference) => (
    <tbody
      ref={reference}
      className={cn('divide-y divide-gray-200 dark:divide-gray-800', className)}
      {...props}
    />
  ),
);
TableBody.displayName = 'TableBody';

const TableFooter = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, reference) => (
    <tfoot
      ref={reference}
      className={cn('bg-muted/50 border-t font-medium [&>tr]:last:border-b-0', className)}
      {...props}
    />
  ),
);
TableFooter.displayName = 'TableFooter';

const TableRow = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, reference) => (
    <tr
      ref={reference}
      className={cn(
        'data-[state=selected]:bg-muted transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50',
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = 'TableRow';

const TableHead = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, reference) => (
    <th
      ref={reference}
      className={cn(
        'h-12 px-4 py-3 text-left align-middle font-medium [&:has([role=checkbox])]:pr-0',
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = 'TableHead';

const TableCell = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, reference) => (
    <td
      ref={reference}
      className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}
      {...props}
    />
  ),
);
TableCell.displayName = 'TableCell';

const TableCaption = forwardRef<HTMLTableCaptionElement, HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, reference) => (
    <caption
      ref={reference}
      className={cn('text-muted-foreground mt-4 text-sm', className)}
      {...props}
    />
  ),
);
TableCaption.displayName = 'TableCaption';

export { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow };
