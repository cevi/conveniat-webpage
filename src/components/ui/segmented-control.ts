import { cn } from '@/utils/tailwindcss-override';

/**
 * The segmented control: a quiet 44px track, the chosen segment a white chip on it. Used for a
 * view, a language and the Material tabs, as buttons or as links.
 *
 * A segment fills the track's full height to the thumb: its hit area reaches over the 3px rim
 * the chip leaves, so a tap on the edge of the track still lands.
 */
export const segmentedTrackClassName = 'bg-quiet flex h-11 rounded-xl p-[3px]';

/** One segment. Mark the chosen one with `aria-pressed` on a button, `aria-current` on a link. */
export const segmentClassName = (isChosen: boolean): string =>
  cn(
    'relative flex min-w-0 cursor-pointer items-center justify-center rounded-[9px] transition-colors',
    'before:absolute before:-inset-y-[3px] before:inset-x-0 first:before:-left-[3px] last:before:-right-[3px]',
    // the track leaves 3px around a segment, too little for the ring outside it
    'focus-visible:focus-ring-inset',
    isChosen ? 'bg-white text-green-900 shadow-xs' : 'text-green-700 hover:text-green-900',
  );
