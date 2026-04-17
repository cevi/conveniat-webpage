/**
 * Shared styling utilities for document control buttons in the Payload CMS admin panel.
 *
 * All custom buttons rendered in the document controls bar (auto-translate, share, publish, unpublish)
 * should use these base classes to ensure consistent hover effects, borders, and spacing.
 */
import { cn } from '@/utils/tailwindcss-override';

/**
 * Base classes shared by all document control buttons.
 * Ensures consistent border, hover border, hover background, and cursor styling.
 */
const documentControlBase =
  'cursor-pointer border border-(--theme-elevation-100) hover:border-(--theme-elevation-500)! hover:bg-(--theme-elevation-100)!';

/**
 * Variant-specific class presets for document control buttons.
 *
 * - `neutral`: Default transparent style (auto-translate, share icon).
 * - `publish`: Green tinted for publish actions.
 * - `unpublish`: Red tinted for unpublish actions.
 * - `iconOnly`: Square icon button with no padding (share icon).
 */
export const documentControlButtonClasses = {
  /** Neutral transparent button with text (e.g. auto-translate). */
  neutral: (extra?: string): string =>
    cn(documentControlBase, 'inline-flex items-center gap-x-[0.4rem]', extra),

  /** Green publish button. */
  publish: (extra?: string): string =>
    cn(
      'cursor-pointer border border-green-300 bg-green-200 text-green-900 hover:border-green-500! hover:bg-green-300! dark:bg-green-700 dark:text-green-100 dark:hover:border-green-400! dark:hover:bg-green-600!',
      extra,
    ),
  /** Red unpublish button. */
  unpublish: (extra?: string): string =>
    cn(
      'cursor-pointer border border-red-300 bg-red-200 text-red-900 hover:border-red-500! hover:bg-red-300! dark:bg-red-800 dark:text-red-100 dark:hover:border-red-400! dark:hover:bg-red-700!',
      extra,
    ),

  /** Square icon-only button (e.g. share). */
  iconOnly: (extra?: string): string =>
    cn(documentControlBase, 'flex aspect-square items-center justify-center px-2.5 py-1!', extra),
};
