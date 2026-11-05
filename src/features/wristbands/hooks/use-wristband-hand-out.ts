'use client';

import { personName } from '@/features/wristbands/components/band-labels';
import type { UndoState } from '@/features/wristbands/components/undo-bar';
import { wristbandErrorTexts } from '@/features/wristbands/error-texts';
import type {
  BandScannerHandlers,
  ScanNotice,
  ScanPhase,
} from '@/features/wristbands/hooks/use-band-scanner';
import { useBandScanner } from '@/features/wristbands/hooks/use-band-scanner';
import { useExpiringState } from '@/features/wristbands/hooks/use-expiring-state';
import { useNativeNfcAvailable } from '@/features/wristbands/hooks/use-native-nfc-available';
import { useQueueOrder } from '@/features/wristbands/hooks/use-queue-order';
import type { PeopleFilters, Queue } from '@/features/wristbands/queue';
import {
  buildQueue,
  pruneOrder,
  putFirst,
  readWristbandList,
  skipPerson,
  wearerOf,
  withBandAssigned,
  withBandReturned,
  withSpareBand,
} from '@/features/wristbands/queue';
import type { SeriesBand } from '@/features/wristbands/series';
import { isSeriesBandDone, recordSeriesBand } from '@/features/wristbands/series';
import { failureNotice, localRefusalTexts } from '@/features/wristbands/texts';
import type { HofPerson, HofWristbandList } from '@/features/wristbands/types';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { userErrorMessage } from '@/utils/user-error-message';
import { useRef, useState } from 'react';

/** How long the bar of a handed-out band offers to undo it. */
const UNDO_FOR_MS = 10_000;

export type HandOutMode = 'handOut' | 'program';

/**
 * Handing out the bands of one Hof: the queue, the continuous scanner and what a band held to
 * the phone does. In `handOut`, the band is programmed, or found programmed already as a spare,
 * and goes to the person "Jetzt dran"; a bar at the foot of the page offers to undo it, which takes the band back
 * and puts the person first again. In `program`, the band becomes a spare band of the Hof.
 *
 * The list in the query cache is updated right away, so the next person is up before the list
 * is fetched again.
 */
export const useWristbandHandOut = ({
  hofId,
  list,
  filters,
  locale,
}: {
  hofId: string;
  list: HofWristbandList;
  filters: PeopleFilters;
  locale: Locale;
}): {
  nfcAvailable: boolean | undefined;
  mode: HandOutMode;
  setMode: (mode: HandOutMode) => void;
  queue: Queue;
  series: SeriesBand[];
  scanner: { phase: ScanPhase; notice: ScanNotice | undefined; resume: () => void };
  /** the band just handed out, while it can be undone */
  undo: { state: UndoState; run: () => void } | undefined;
  skip: (person: HofPerson) => void;
  putFirst: (person: HofPerson) => void;
} => {
  const utils = trpc.useUtils();
  const nfcAvailable = useNativeNfcAvailable();
  const [mode, setMode] = useState<HandOutMode>('handOut');
  const [order, updateOrder] = useQueueOrder(hofId);
  const [series, setSeries] = useState<SeriesBand[]>([]);
  const queue = buildQueue(list.people, filters, order);
  // whom the band on the phone goes to, fixed the moment it is held there
  const targetReference = useRef<HofPerson | undefined>(undefined);
  const [lastHandOut, setLastHandOut] = useExpiringState<{
    uid: string;
    person: HofPerson;
    state: UndoState;
  }>(UNDO_FOR_MS);

  /** The freshest list there is: the cache may be ahead of the render. */
  const latestList = (): HofWristbandList => {
    const cached = utils.wristband.getHofWristbandList.getData({ hofId });
    return cached === undefined ? list : readWristbandList(cached);
  };
  const changeList = (change: (current: HofWristbandList) => HofWristbandList): void => {
    utils.wristband.getHofWristbandList.setData({ hofId }, (current) =>
      change(readWristbandList(current ?? list)),
    );
  };
  const refresh = (): void => {
    void utils.wristband.getHofWristbandList.invalidate({ hofId });
  };

  const wornByNotice = (uid: string): ScanNotice | null => {
    const wearer = wearerOf(latestList().people, uid);
    if (wearer === undefined) return null;
    return {
      kind: 'refused',
      ...failureNotice(localRefusalTexts.wornBy, locale, { name: personName(wearer) }),
    };
  };

  const errorNotice = (error: unknown): ScanNotice => ({
    kind: 'refused',
    title: userErrorMessage(error, locale, wristbandErrorTexts),
    description: '',
  });

  const undo = async (): Promise<void> => {
    if (lastHandOut?.state.step !== 'offer') return;
    const { uid, person } = lastHandOut;
    setLastHandOut({ ...lastHandOut, state: { step: 'undoing', name: person.fullName } });
    try {
      await utils.client.wristband.unassignWristband.mutate({ hofId, uid });
      changeList((current) => withBandReturned(current, uid));
      // the person is "Jetzt dran" again, which says the undo worked
      updateOrder((current) => putFirst(current, person.registrationId));
      setLastHandOut(undefined);
    } catch (error) {
      setLastHandOut({
        ...lastHandOut,
        state: { step: 'failed', message: userErrorMessage(error, locale, wristbandErrorTexts) },
      });
    } finally {
      refresh();
    }
  };

  const handOutHandlers: BandScannerHandlers = {
    onBandDetected: (uid) => {
      const refused = wornByNotice(uid);
      if (refused !== null) return refused;
      targetReference.current = queue.current;
      return null;
    },
    onRecorded: async (uid) => {
      const person = targetReference.current;
      if (person === undefined) {
        // nobody was up any more: the band stays a spare of the Hof
        changeList((current) => withSpareBand(current, uid));
        return null;
      }
      try {
        await utils.client.wristband.assignWristband.mutate({
          hofId,
          uid,
          registrationId: person.registrationId,
        });
      } catch (error) {
        changeList((current) => withSpareBand(current, uid));
        refresh();
        return errorNotice(error);
      }
      changeList((current) => withBandAssigned(current, uid, person.registrationId));
      refresh();
      setLastHandOut({ uid, person, state: { step: 'offer', name: person.fullName } });
      return null;
    },
  };

  // the run read through a reference: a band left on the phone is detected before a render
  const seriesReference = useRef(series);
  const changeSeries = (change: (current: SeriesBand[]) => SeriesBand[]): void => {
    seriesReference.current = change(seriesReference.current);
    setSeries(seriesReference.current);
  };
  const programHandlers: BandScannerHandlers = {
    onBandDetected: (uid) => {
      if (isSeriesBandDone(seriesReference.current, uid)) {
        return { kind: 'refused', ...failureNotice(localRefusalTexts.alreadyProgrammed, locale) };
      }
      return wornByNotice(uid);
    },
    onRecorded: (uid) => {
      changeList((current) => withSpareBand(current, uid));
      changeSeries((current) => recordSeriesBand(current, uid, 'done'));
      refresh();
      return Promise.resolve(null);
    },
    onFailed: (uid, kind) => {
      if (uid === undefined || kind === 'stop') return;
      changeSeries((current) => recordSeriesBand(current, uid, kind));
    },
  };

  const scanner = useBandScanner({
    hofId,
    active: nfcAvailable === true && (mode === 'program' || queue.current !== undefined),
    locale,
    handlers: mode === 'program' ? programHandlers : handOutHandlers,
  });

  return {
    nfcAvailable,
    mode,
    setMode,
    queue,
    series,
    scanner,
    undo:
      lastHandOut === undefined ? undefined : { state: lastHandOut.state, run: () => void undo() },
    skip: (person) =>
      updateOrder((current) => skipPerson(pruneOrder(current, list.people), person.registrationId)),
    putFirst: (person) =>
      updateOrder((current) => putFirst(pruneOrder(current, list.people), person.registrationId)),
  };
};
