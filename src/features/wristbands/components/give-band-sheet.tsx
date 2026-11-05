'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/buttons/button';
import { bandUidOf, isBandLink } from '@/features/wristbands/band-link';
import { personDetails } from '@/features/wristbands/components/band-labels';
import { ScanNoticeBox } from '@/features/wristbands/components/scan-notice-box';
import type { GiveStep } from '@/features/wristbands/hooks/use-give-band';
import { useGiveBand } from '@/features/wristbands/hooks/use-give-band';
import { useNativeNfcAvailable } from '@/features/wristbands/hooks/use-native-nfc-available';
import { translate } from '@/features/wristbands/texts';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { claimAppLinks } from '@/hooks/use-app-webview-navigate';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Check, ChevronRight, Loader2, Nfc, RefreshCw } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/** How long the sheet shows a band handed out before it closes for the next person. */
const CLOSE_AFTER_MS = 2500;

/** Closes the sheet a moment after the band is the person's, unless the AVP acts first. */
const useCloseWhenDone = (step: GiveStep, onClose: () => void): void => {
  const done = step.step === 'done';
  const undone = step.step === 'undone';
  // read through a reference: the page renders anew whenever the list changes
  const onCloseReference = useRef(onClose);
  useEffect(() => {
    onCloseReference.current = onClose;
  });
  useEffect(() => {
    if (undone) {
      onCloseReference.current();
      return;
    }
    if (!done) return;
    const timer = setTimeout(() => onCloseReference.current(), CLOSE_AFTER_MS);
    return (): void => clearTimeout(timer);
  }, [done, undone]);
};

/** How the open part of the sheet takes a tapped band; `true` if it did. */
type TakeBand = (target: URL) => boolean;

/** Hands the sheet how its open part takes a tapped band, undefined once it takes none. */
type OfferTake = (take?: TakeBand) => void;

/**
 * Offers the sheet the band taps its open part takes: while it waits for a band, any band, which
 * starts the scanner listening again; once a band was given, that band, laid on the phone again
 * while the sheet still says whose it is now.
 */
const useTakeBandTaps = (take: TakeBand | undefined, offer: OfferTake): void => {
  useEffect(() => {
    if (take === undefined) return;
    offer(take);
    return (): void => offer();
  }, [take, offer]);
};

/**
 * A band tapped while the sheet is open never opens a sheet of its own over it. What the open
 * part takes stays here, see `useTakeBandTaps`; any other band closes the sheet, and the band's
 * own page is the one sheet.
 */
const useBandTapsStayOneSheet = (open: boolean, onClose: () => void): OfferTake => {
  const takeBand = useRef<TakeBand | undefined>(undefined);
  const offer = useCallback<OfferTake>((take) => {
    takeBand.current = take;
  }, []);
  const onCloseReference = useRef(onClose);
  useEffect(() => {
    onCloseReference.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    return claimAppLinks((target) => {
      if (!isBandLink(target)) return false;
      if (takeBand.current?.(target) === true) return true;
      onCloseReference.current();
      return false;
    });
  }, [open]);
  return offer;
};

const CancelButton: React.FC<{ locale: Locale; onClose: () => void }> = ({ locale, onClose }) => (
  <Button variant="quiet" size="touch" className="mt-6 w-full" onClick={onClose}>
    {translate('cancel', locale)}
  </Button>
);

const Circle: React.FC<{ tone: 'scan' | 'done'; pulse?: boolean; children: React.ReactNode }> = ({
  tone,
  pulse = false,
  children,
}) => (
  <div
    className={cn(
      'mx-auto my-6 grid size-28 place-items-center rounded-full',
      tone === 'done'
        ? 'bg-conveniat-green text-white [&_svg]:size-14'
        : 'bg-tint text-conveniat-green ring-[14px] ring-green-50 [&_svg]:size-12',
      pulse && 'animate-pulse',
    )}
    aria-hidden
  >
    {children}
  </div>
);

const phaseHint = (phase: string, locale: Locale): string => {
  if (phase === 'checking') return translate('checking', locale);
  if (phase === 'writing') return translate('writing', locale);
  if (phase === 'saving') return translate('saving', locale);
  return translate('holdBandShort', locale);
};

/** The band for the person: the scanner, then that it is theirs, or what to do instead. */
const GiveBand: React.FC<{
  hofId: string;
  list: HofWristbandList;
  person: HofPerson;
  replace: boolean;
  locale: Locale;
  onClose: () => void;
  /** takes a band tapped while the scanner was not listening, see `useBandTapsStayOneSheet` */
  offerTake: OfferTake;
}> = ({ hofId, list, person, replace, locale, onClose, offerTake }) => {
  const nfcAvailable = useNativeNfcAvailable();
  const { step, scanner, undo } = useGiveBand({
    hofId,
    list,
    person,
    replace,
    active: nfcAvailable === true,
    locale,
  });
  useCloseWhenDone(step, onClose);
  const waiting = step.step === 'scan' && nfcAvailable === true;
  const givenUid = 'uid' in step ? step.uid : undefined;
  const resumeScanner = scanner.resume;
  const take = useMemo((): TakeBand | undefined => {
    if (waiting) {
      return (): boolean => {
        resumeScanner();
        return true;
      };
    }
    if (givenUid !== undefined) return (target): boolean => bandUidOf(target) === givenUid;
    return undefined;
  }, [waiting, givenUid, resumeScanner]);
  useTakeBandTaps(take, offerTake);
  const name = person.nickname ?? person.fullName;

  if (step.step !== 'scan') {
    return (
      <div className="text-center" aria-live="polite">
        <Circle tone="done">
          <Check />
        </Circle>
        <p className="font-heading text-heading text-[17px] font-bold">
          {translate('bandIsNow', locale, { name })}
        </p>
        <p className="mt-1 text-[13px] text-green-700">{translate('bandIsNowHint', locale)}</p>
        {step.step === 'undoFailed' && (
          <p className="text-danger-text mt-3 text-[13px] font-semibold" role="alert">
            {step.message}
          </p>
        )}
        <div className={cn('mt-6 grid gap-2.5', undo !== undefined && 'grid-cols-2')}>
          {undo !== undefined && (
            <Button variant="quiet" size="touch" disabled={step.step === 'undoing'} onClick={undo}>
              {step.step === 'undoing' && <Loader2 className="animate-spin" aria-hidden />}
              {translate(step.step === 'undoing' ? 'undoing' : 'undo', locale)}
            </Button>
          )}
          <Button variant="primary" size="touch" onClick={onClose}>
            {translate('nextPerson', locale)}
          </Button>
        </div>
      </div>
    );
  }

  if (nfcAvailable === false) {
    return (
      <div className="bg-quiet mt-6 rounded-[14px] p-4 text-left">
        <p className="text-[15px] font-semibold text-green-900">
          {translate('notInAppTitle', locale)}
        </p>
        <p className="mt-0.5 text-[13px] text-green-700">
          {translate('notInAppDescription', locale)}
        </p>
        <CancelButton locale={locale} onClose={onClose} />
      </div>
    );
  }

  const { phase, notice, resume } = scanner;
  const busy = phase === 'checking' || phase === 'writing' || phase === 'saving';
  return (
    <div className="text-center">
      <Circle tone="scan" pulse={phase === 'waiting'}>
        {busy ? <Loader2 className="animate-spin" /> : <Nfc />}
      </Circle>
      <div aria-live="polite">
        <p className="font-heading text-heading text-[17px] font-bold">
          {translate(replace ? 'holdNewBand' : 'holdBand', locale)}
        </p>
        <p className="mt-1 text-[13px] text-green-700">{phaseHint(phase, locale)}</p>
      </div>
      {replace && (
        <p className="mt-3 text-[13px] text-green-700">{translate('oldBandBlocked', locale)}</p>
      )}
      {notice !== undefined && (
        <div className="mt-4 text-left">
          <ScanNoticeBox notice={notice} />
        </div>
      )}
      {phase === 'paused' && (
        <Button variant="primary" size="touch" className="mt-4 w-full" onClick={resume}>
          <Nfc aria-hidden />
          {translate('resume', locale)}
        </Button>
      )}
      <CancelButton locale={locale} onClose={onClose} />
    </div>
  );
};

/**
 * The sheet a person of the list opens at the station. Without a band it waits for one right
 * away; with a band it offers a new one for a lost one, which blocks the old.
 */
export const GiveBandSheet: React.FC<{
  hofId: string;
  list: HofWristbandList;
  person: HofPerson | undefined;
  locale: Locale;
  onClose: () => void;
}> = ({ hofId, list, person, locale, onClose }) => {
  const [replacing, setReplacing] = useState(false);
  const open = person !== undefined;
  const close = (): void => {
    setReplacing(false);
    onClose();
  };
  const wearsBand = person?.band !== null && person?.band !== undefined;
  const choosing = wearsBand && !replacing;
  const offerTake = useBandTapsStayOneSheet(open, close);

  return (
    <BottomSheet
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={person?.fullName ?? ''}
      hideTitle
      footer={
        choosing ? (
          <Button variant="quiet" size="touch" className="w-full" onClick={close}>
            {translate('close', locale)}
          </Button>
        ) : undefined
      }
    >
      {person !== undefined && (
        <div className="pt-1 pb-2">
          <div className="text-center">
            {replacing && (
              <p className="text-[12px] font-semibold tracking-[0.12em] text-green-700 uppercase">
                {translate('newBand', locale)}
              </p>
            )}
            <p className="font-heading text-heading text-[28px] leading-tight font-extrabold break-words">
              {person.fullName}
            </p>
            <p className="mt-1 text-[17px] text-green-700">{personDetails(person, locale)}</p>
          </div>
          {choosing ? (
            <>
              <p className="mt-2 text-center text-[13px] text-green-700">
                {translate('wearsBandSince', locale)}
              </p>
              <button
                type="button"
                className="border-line hover:bg-quiet focus-visible:focus-surface mt-5 flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-[14px] border bg-white px-4 py-2.5 text-left"
                onClick={() => setReplacing(true)}
              >
                <span className="bg-tint text-conveniat-green grid size-10 shrink-0 place-items-center rounded-xl">
                  <RefreshCw className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-green-900">
                    {translate('giveNewBand', locale)}
                  </span>
                  <span className="block text-[13px] text-green-700">
                    {translate('giveNewBandHint', locale)}
                  </span>
                </span>
                <ChevronRight className="size-5 shrink-0 text-green-500" aria-hidden />
              </button>
            </>
          ) : (
            // keyed: a new band starts the scanner and its steps anew
            <GiveBand
              key={`${person.registrationId}-${String(replacing)}`}
              hofId={hofId}
              list={list}
              person={person}
              replace={replacing}
              locale={locale}
              onClose={close}
              offerTake={offerTake}
            />
          )}
        </div>
      )}
    </BottomSheet>
  );
};
