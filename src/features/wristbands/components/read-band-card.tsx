'use client';

import { Button } from '@/components/ui/buttons/button';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import type { ReadState } from '@/features/wristbands/hooks/use-read-wristband';
import { readerText, readFailureText } from '@/features/wristbands/reader-texts';
import { translate } from '@/features/wristbands/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CircleAlert, Loader2, ScanLine } from 'lucide-react';
import type React from 'react';

/**
 * The reader's one main action and where it stands: "Armband lesen", then the band to hold to
 * the phone, since Android shows nothing of its own, and what went wrong with the way on.
 */
export const ReadBandCard: React.FC<{
  state: ReadState;
  locale: Locale;
  onStart: () => void;
  onCancel: () => void;
  /** the main action, "Armband lesen" unless the page reads the band for something else */
  label?: string;
}> = ({ state, locale, onStart, onCancel, label }) => {
  if (state.step === 'idle' || state.step === 'read') {
    return (
      <Button variant="primary" size="touch" className="w-full" onClick={onStart}>
        <ScanLine aria-hidden />
        {label ?? readerText('read', locale)}
      </Button>
    );
  }

  if (state.step === 'failed') {
    const failure = readFailureText(state.code);
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
          {/* a lost tag is common on Android: the same band again usually works */}
          {failure.retry && (
            <Button variant="primary" size="touch" onClick={onStart}>
              {readerText('retry', locale)}
            </Button>
          )}
          <Button variant="quiet" size="touch" onClick={onCancel}>
            {readerText('close', locale)}
          </Button>
        </div>
      </section>
    );
  }

  const waiting = state.step === 'waiting';
  return (
    <Card as="section" className="space-y-4 p-4">
      <div className="flex items-center gap-3" aria-live="polite">
        <IconTile icon={ScanLine} size="lg" className={cn(waiting && 'animate-pulse')} />
        <div className="min-w-0">
          <h2 className="font-heading text-heading text-[17px] leading-snug font-bold">
            {translate('holdBand', locale)}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] text-green-700">
            {!waiting && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
            {waiting ? readerText('holdBandHint', locale) : translate('checking', locale)}
          </p>
        </div>
      </div>
      {waiting && (
        <Button variant="outlined" size="touch" className="w-full" onClick={onCancel}>
          {translate('cancel', locale)}
        </Button>
      )}
    </Card>
  );
};
