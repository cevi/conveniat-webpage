'use client';
import { personName } from '@/features/wristbands/components/band-labels';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import {
  readWristbandList,
  wearerOf,
  withBandAssigned,
  withBandReturned,
  withSpareBand,
} from '@/features/wristbands/hof-list';
import type {
  BandScannerHandlers,
  ScanNotice,
  ScanPhase,
} from '@/features/wristbands/hooks/use-band-scanner';
import { useBandScanner } from '@/features/wristbands/hooks/use-band-scanner';
import { failureNotice, localRefusalTexts } from '@/features/wristbands/texts';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { useTRPC, useTRPCClient } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';

/** Where giving one person their band stands. */
export type GiveStep =
  /** the scanner waits for the band, or works on it */
  | { step: 'scan' }
  /** the band is the person's; a first band can still be undone */
  | { step: 'done'; uid: string }
  | { step: 'undoing'; uid: string }
  | { step: 'undoFailed'; uid: string; message: string }
  /** the band went back to the Hof; the sheet closes */
  | { step: 'undone' };

/**
 * Gives the person the station chose a band: the scanner runs while the sheet waits for one,
 * and the band held to the phone is programmed, or found programmed already, and becomes theirs.
 * With `replace`, the person's old band is blocked for the new one, since it was lost or broke.
 * A first band can be undone right after; it goes back to the Hof for the next person. A
 * replacement cannot, because only the admins unblock the old band.
 *
 * The cached list changes at once, so the person leaves "Noch ohne Band" before the list is
 * fetched again.
 */
export const useGiveBand = ({
  hofId,
  list,
  person,
  replace,
  active,
  locale,
}: {
  hofId: string;
  list: HofWristbandList;
  person: HofPerson;
  replace: boolean;
  /** whether the sheet is open on a phone with NFC */
  active: boolean;
  locale: Locale;
}): {
  step: GiveStep;
  scanner: { phase: ScanPhase; notice: ScanNotice | undefined; resume: () => void };
  undo: (() => void) | undefined;
} => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const trpcClient = useTRPCClient();
  const [step, setStep] = useState<GiveStep>({ step: 'scan' });

  /** The freshest list there is: the cache may be ahead of the render. */
  const latestList = (): HofWristbandList => {
    const cached = queryClient.getQueryData(trpc.wristband.getHofWristbandList.queryKey({ hofId }));
    return cached === undefined ? list : readWristbandList(cached);
  };
  const changeList = (change: (current: HofWristbandList) => HofWristbandList): void => {
    queryClient.setQueryData(trpc.wristband.getHofWristbandList.queryKey({ hofId }), (current) =>
      change(readWristbandList(current ?? list)),
    );
  };
  const refresh = (): void => {
    void queryClient.invalidateQueries(trpc.wristband.getHofWristbandList.queryFilter({ hofId }));
  };

  const handlers: BandScannerHandlers = {
    onBandDetected: (uid) => {
      const wearer = wearerOf(latestList().people, uid);
      if (wearer === undefined) return null;
      const text =
        wearer.registrationId === person.registrationId
          ? localRefusalTexts.oldBand
          : localRefusalTexts.wornBy;
      return { kind: 'refused', ...failureNotice(text, locale, { name: personName(wearer) }) };
    },
    onRecorded: async (uid) => {
      const input = { hofId, uid, registrationId: person.registrationId };
      try {
        await (replace
          ? trpcClient.wristband.replaceWristband.mutate(input)
          : trpcClient.wristband.assignWristband.mutate(input));
      } catch (error) {
        // recorded for the Hof but nobody's: the next person can take it
        changeList((current) => withSpareBand(current, uid));
        refresh();
        // a helper the AVP removed meanwhile sees the page without the station once it reloads
        void queryClient.invalidateQueries(trpc.wristband.getMyHofList.pathFilter());
        return {
          kind: 'refused',
          title: userErrorMessage(error, locale, wristbandErrorTexts),
          description: '',
        };
      }
      changeList((current) => withBandAssigned(current, uid, person.registrationId));
      refresh();
      setStep({ step: 'done', uid });
      return null;
    },
  };

  const scanner = useBandScanner({
    hofId,
    active: active && step.step === 'scan',
    locale,
    handlers,
  });

  const undo = async (uid: string): Promise<void> => {
    setStep({ step: 'undoing', uid });
    try {
      await trpcClient.wristband.unassignWristband.mutate({ hofId, uid });
      changeList((current) => withBandReturned(current, uid));
      setStep({ step: 'undone' });
    } catch (error) {
      setStep({
        step: 'undoFailed',
        uid,
        message: userErrorMessage(error, locale, wristbandErrorTexts),
      });
    } finally {
      refresh();
    }
  };

  const canUndo = !replace && (step.step === 'done' || step.step === 'undoFailed');
  return {
    step,
    scanner,
    undo: canUndo ? (): void => void undo(step.uid) : undefined,
  };
};
