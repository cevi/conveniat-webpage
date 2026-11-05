'use client';

import { Button } from '@/components/ui/buttons/button';
import { translate } from '@/features/wristbands/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, CircleAlert, Loader2, Undo2 } from 'lucide-react';
import type React from 'react';

/** What the bar at the foot of the page says about the band just handed out. */
export type UndoState =
  | { step: 'offer'; name: string }
  | { step: 'undoing'; name: string }
  | { step: 'failed'; message: string };

/**
 * The band just handed out, "✓ Band → Lea Meier", and the way to take it back: a card fixed at
 * the foot of the page, above the app's tab bar and the phone's home indicator. The page leaves
 * room under its last row while it is there, see `UNDO_BAR_ROOM`.
 */
export const UndoBar: React.FC<{
  state: UndoState;
  locale: Locale;
  onUndo: () => void;
}> = ({ state, locale, onUndo }) => {
  const failed = state.step === 'failed';
  return (
    <div
      role="status"
      className={cn(
        'border-line fixed right-4 bottom-[calc(var(--app-tab-bar-height)+max(12px,env(safe-area-inset-bottom)))] left-[calc(var(--app-content-left)+1rem)] z-30 mx-auto flex min-h-[52px] max-w-[34rem] items-center gap-3 rounded-[14px] border bg-white py-1 pr-1 pl-4',
        failed && 'border-danger-line',
      )}
    >
      {failed ? (
        <CircleAlert className="text-danger size-5 shrink-0" aria-hidden />
      ) : (
        <Check className="text-conveniat-green size-5 shrink-0" aria-hidden />
      )}
      <span
        className={cn(
          'min-w-0 flex-1 py-2 text-[15px] leading-5 font-semibold',
          failed ? 'text-danger-text' : 'text-heading',
        )}
      >
        {failed ? state.message : translate('assigned', locale, { name: state.name })}
      </span>
      {!failed && (
        <Button
          variant="outlined"
          size="touch"
          className="shrink-0"
          disabled={state.step === 'undoing'}
          onClick={onUndo}
        >
          {state.step === 'undoing' ? (
            <Loader2 className="animate-spin" aria-hidden />
          ) : (
            <Undo2 aria-hidden />
          )}
          {translate('undo', locale)}
        </Button>
      )}
    </div>
  );
};

/** Room under the page's last row while the bar is there: its height and its gap. */
export const UNDO_BAR_ROOM = 'pb-24';
