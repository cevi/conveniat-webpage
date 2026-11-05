'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import type { ProgramState } from '@/features/wristbands/hooks/use-program-wristband';
import { nfcFailureText, translate } from '@/features/wristbands/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CircleAlert, Loader2, Nfc } from 'lucide-react';
import type React from 'react';

/**
 * The page's one main action and where it stands: "Band programmieren", then the state the
 * phone is in while the band lies on it, since Android shows nothing of its own, and what went
 * wrong with the way on.
 */
export const ProgramBandCard: React.FC<{
  state: ProgramState;
  locale: Locale;
  onStart: () => void;
  onCancel: () => void;
  onClose: () => void;
}> = ({ state, locale, onStart, onCancel, onClose }) => {
  if (state.step === 'idle') {
    return (
      <Button variant="primary" size="touch" className="w-full" onClick={onStart}>
        <Nfc aria-hidden />
        {translate('program', locale)}
      </Button>
    );
  }

  if (state.step === 'failed') {
    const failure = nfcFailureText(state.code, state.reason);
    return (
      <section
        role="alert"
        className="border-danger-line bg-danger-soft space-y-3 rounded-[14px] border p-4"
      >
        <div className="flex items-start gap-3">
          <CircleAlert className="text-danger mt-0.5 size-6 shrink-0" aria-hidden />
          <div className="min-w-0">
            <h2 className="font-heading text-danger-text text-[17px] leading-snug font-bold">
              {failure.title[locale]}
            </h2>
            <p className="mt-1 text-[15px] leading-normal text-green-900">
              {failure.description[locale]}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-[minmax(0,1fr)_auto]">
          <Button variant="primary" size="touch" onClick={onStart}>
            {translate(failure.retry ? 'retry' : 'programOther', locale)}
          </Button>
          <Button variant="quiet" size="touch" onClick={onClose}>
            {translate('close', locale)}
          </Button>
        </div>
      </section>
    );
  }

  const waiting = state.step === 'waiting';
  // nothing is written before the server answered; once it is, a cancel would leave it half done
  const cancellable = state.step !== 'writing';
  return (
    <Card as="section" className="space-y-4 p-4">
      <div className="flex items-center gap-3" aria-live="polite">
        <IconTile icon={Nfc} size="lg" className={cn(waiting && 'animate-pulse')} />
        <div className="min-w-0">
          <h2 className="font-heading text-heading text-[17px] leading-snug font-bold">
            {translate('holdBand', locale)}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] text-green-700">
            {!waiting && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
            {waiting
              ? translate('holdBandHint', locale)
              : translate(state.step === 'checking' ? 'checking' : 'writing', locale)}
          </p>
        </div>
      </div>
      {cancellable && (
        <Button variant="outlined" size="touch" className="w-full" onClick={onCancel}>
          {translate('cancel', locale)}
        </Button>
      )}
    </Card>
  );
};
