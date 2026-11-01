import { cn } from '@/utils/tailwindcss-override';
import Link from 'next/link';
import type React from 'react';

type Tone = 'default' | 'danger';

const toneClassName: Record<Tone, string> = {
  default: 'hover:bg-quiet focus-visible:focus-row',
  danger: 'text-danger-text hover:bg-danger-soft focus-visible:focus-row-danger',
};

/**
 * The classes of a row that does something, for an element `ListRow` cannot render, like a
 * Headless UI button. Padding and height are the default row's; `className` overrides them.
 */
export const listRowClassName = (tone: Tone = 'default'): string =>
  cn(
    'relative flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    toneClassName[tone],
  );

type ListRowProperties = { tone?: Tone; className?: string; children: React.ReactNode } & (
  | ({ href: string } & Omit<React.ComponentProps<typeof Link>, 'className' | 'href'>)
  | ({ href?: undefined } & Omit<React.ComponentProps<'button'>, 'className'>)
);

/**
 * A row of a list or a card that leads somewhere (`href`) or does something: hover takes the
 * quiet surface, keyboard focus the same surface with a ring inside the row, so the corner of a
 * card never clips it. `danger` is for a row that destroys something, and says what.
 */
export const ListRow: React.FC<ListRowProperties> = ({
  tone = 'default',
  className,
  ...properties
}) => {
  const rowClassName = cn(listRowClassName(tone), className);
  if (properties.href === undefined) {
    return <button type="button" {...properties} className={rowClassName} />;
  }
  return <Link {...properties} className={rowClassName} />;
};
