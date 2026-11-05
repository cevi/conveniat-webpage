'use client';

import { Button } from '@/components/ui/buttons/button';
import { IconTile } from '@/components/ui/icon-tile';
import type { ScanNotice, ScanPhase } from '@/features/wristbands/hooks/use-band-scanner';
import { translate } from '@/features/wristbands/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { CircleAlert, Loader2, Nfc, RotateCcw } from 'lucide-react';
import type React from 'react';

const phaseText = (phase: ScanPhase, locale: Locale): string => {
  if (phase === 'checking') return translate('checking', locale);
  if (phase === 'writing') return translate('writing', locale);
  if (phase === 'saving') return translate('saving', locale);
  return translate('holdBandHint', locale);
};

/** What went wrong with the last band, right where the AVP looks. */
const Notice: React.FC<{ notice: ScanNotice }> = ({ notice }) => {
  const refused = notice.kind === 'refused';
  const Icon = refused ? CircleAlert : RotateCcw;
  return (
    <div
      role={refused ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-xl p-3',
        refused ? 'bg-danger-soft border-danger-line border' : 'bg-quiet',
      )}
    >
      <Icon
        className={cn('mt-0.5 size-5 shrink-0', refused ? 'text-danger' : 'text-green-700')}
        aria-hidden
      />
      <div className="min-w-0">
        <p
          className={cn(
            'text-[15px] leading-snug font-semibold',
            refused ? 'text-danger-text' : 'text-green-900',
          )}
        >
          {notice.title}
        </p>
        {notice.description !== '' && (
          <p className="mt-0.5 text-[13px] leading-normal text-green-700">{notice.description}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Where the scanner stands, under what it scans for: hold a band, checking, writing, and what
 * went wrong with the last band. Stopped, it offers "Weiter scannen", the view's one primary
 * action while nothing scans.
 */
export const ScanStatus: React.FC<{
  phase: ScanPhase;
  notice: ScanNotice | undefined;
  locale: Locale;
  onResume: () => void;
}> = ({ phase, notice, locale, onResume }) => {
  if (phase === 'off') return <></>;
  if (phase === 'paused') {
    return (
      <div className="space-y-3">
        {notice !== undefined && <Notice notice={notice} />}
        <Button variant="primary" size="touch" className="w-full" onClick={onResume}>
          <Nfc aria-hidden />
          {translate('resume', locale)}
        </Button>
      </div>
    );
  }

  const waiting = phase === 'waiting';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" aria-live="polite">
        <IconTile icon={Nfc} className={cn(waiting && 'animate-pulse')} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-green-900">
            {translate('holdBand', locale)}
          </p>
          <p className="flex items-center gap-1.5 text-[13px] leading-normal text-green-700">
            {!waiting && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
            {phaseText(phase, locale)}
          </p>
        </div>
      </div>
      {notice !== undefined && <Notice notice={notice} />}
    </div>
  );
};
