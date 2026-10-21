import { cn } from '@/utils/tailwindcss-override';

/**
 * Every text field in the app looks and focuses the same way, so these are the only places a
 * field's frame is defined. Sizes are px, not rem: the root font is larger on desktop, and a
 * field has to stay as tall as the 44px buttons beside it.
 *
 * - a field always stands out from what it sits on: on a white surface, like the head of Chats,
 *   a search is filled grey without a border; on the grey page, like Material's "Hof suchen",
 *   it is white with a thin line, as a form field always is
 * - a form field is white with a thin border, like the design's "Gruppenname"
 * - both are 44px high with the 12px radius of the scale, and both show focus as the same 2px
 *   brand-green ring, never as a changed border or the browser's outline
 */
const focusRing = 'focus-within:ring-conveniat-green focus-within:ring-2';

/** The frame around a search input: an icon, the input, and a clear button. */
export const searchFieldClassName = cn(
  'bg-quiet flex h-[44px] min-w-0 items-center gap-[10px] rounded-[12px] pl-[14px]',
  focusRing,
);

/** The frame around a search that sits on the grey page rather than on a white surface. */
export const searchFieldOnPageClassName = cn(
  'border-line flex h-[44px] min-w-0 items-center gap-[10px] rounded-[12px] border bg-white pl-[14px]',
  focusRing,
);

/** The frame around a form input or textarea that is not a search. */
export const formFieldClassName = cn(
  'border-line flex min-h-[44px] min-w-0 items-center rounded-[12px] border bg-white',
  focusRing,
);

/** The input inside either frame: it brings no frame of its own. */
export const fieldInputClassName =
  'h-full min-h-[42px] min-w-0 flex-1 bg-transparent px-[14px] text-[15px] text-green-900 outline-hidden placeholder:text-green-500 [&::-webkit-search-cancel-button]:hidden';

/**
 * A form input or textarea that is its own frame, for a field without an icon or button inside:
 * the form field's look on a single element.
 */
export const textInputClassName =
  'border-line block min-h-[44px] w-full rounded-[12px] border bg-white px-[14px] py-[10px] text-[15px] leading-[22px] text-green-900 outline-hidden placeholder:text-green-500 focus-visible:ring-conveniat-green focus-visible:ring-2 disabled:bg-quiet disabled:text-green-500';
