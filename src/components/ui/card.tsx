import { cn } from '@/utils/tailwindcss-override';
import type React from 'react';

/**
 * The app's card: white, a 14px radius and a thin line, without a shadow. A list in a card is
 * `divided`, its rows separated by the same line. A section's heading sits above the card as a
 * `SectionLabel`, never as a strip inside it.
 */
export const Card: React.FC<{
  children: React.ReactNode;
  /** `ul` for a list of rows, `section` for a card that is a section on its own */
  as?: 'div' | 'section' | 'ul';
  divided?: boolean;
  className?: string;
}> = ({ children, as: Tag = 'div', divided = false, className }) => (
  <Tag
    className={cn(
      'border-line overflow-hidden rounded-[14px] border bg-white',
      divided && 'divide-line divide-y',
      className,
    )}
  >
    {children}
  </Tag>
);
