'use client';

import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { Button } from '@/components/ui/buttons/button';
import { ShareLinkButton } from '@/components/ui/buttons/share-link-button';
import { environmentVariables } from '@/config/environment-variables';
import { useScheduleEntries } from '@/context/schedule-entries-context';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { ScheduleDetailContent } from '@/features/schedule/components/schedule-detail-content';
import { ScheduleDetailSkeleton } from '@/features/schedule/components/schedule-detail-skeleton';
import { ScheduleEditHeaderActions } from '@/features/schedule/components/schedule-edit-header-actions';
import { useScheduleEdit } from '@/features/schedule/hooks/use-schedule-edit';
import { useScheduleScope } from '@/features/schedule/hooks/use-schedule-scope';
import {
  findOtherSlots,
  findWhatComesNext,
  isForQuartiere,
  quartiereOf,
} from '@/features/schedule/utils/programme-utils';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { ArrowLeft } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import React, { useCallback, useMemo, useState } from 'react';

const labels = {
  back: { de: 'Zurück', en: 'Back', fr: 'Retour' },
  retry: { de: 'Erneut versuchen', en: 'Retry', fr: 'Réessayer' },
  notFound: { de: 'Eintrag nicht gefunden', en: 'Entry not found', fr: 'Entrée non trouvée' },
  errorLoading: {
    de: 'Beim Laden des Zeitplaneintrags ist ein Fehler aufgetreten.',
    en: 'Something went wrong loading the schedule entry.',
    fr: "Une erreur est survenue lors du chargement de l'entrée du planning.",
  },
} as const;

/** a round white button floating over the map */
const floatingButtonClassName =
  'flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white p-0 text-green-900 shadow-[0_2px_8px_rgba(0,0,0,0.16)] hover:bg-white';

/** above the bottom navigation, which is `h-20` */
const containerClassName =
  'fixed inset-x-0 top-0 bottom-20 z-[110] flex flex-col overflow-hidden bg-page';

interface ScheduleDetailViewProperties {
  id: string;
}

/**
 * The page of one block: its place on a map at the top, with the way back, sharing and the star
 * floating over it, and below everything the block holds. Fetches through tRPC and falls back
 * to the offline copies, so a block once seen opens without signal.
 */
export const ScheduleDetailView: React.FC<ScheduleDetailViewProperties> = ({ id: initialId }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();
  // set once the user opens another slot or block from this page
  const [openedId, setOpenedId] = useState<string>();
  const { myQuartierIds } = useScheduleScope();

  const trpcUtils = trpc.useUtils();

  // 1. Try to find the entry in the local TanStack DB cache first (offline support)
  const { entries: localEntries } = useScheduleEntries();

  // 2. Also check the schedule list cache from tRPC (direct cache read + query hook)
  const { data: scheduleList } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,

    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
  const trpcDirectEntries = trpcUtils.schedule.getScheduleEntries.getData();
  const allEntries = scheduleList ?? trpcDirectEntries ?? localEntries;

  // A link to a block, shared from another Quartier or tapped in the whole camp's list, opens
  // on the user's own slot of it. Everything below, the facts, enrolment, the star, sharing and
  // editing, is about that one slot.
  const ownSlotId = useMemo(() => {
    if (myQuartierIds.size === 0) return;
    const opened = allEntries.find((candidate) => candidate.id === initialId);
    if (opened === undefined) return;
    return [opened, ...findOtherSlots(allEntries, opened)].find(
      (candidate) => quartiereOf(candidate).length > 0 && isForQuartiere(candidate, myQuartierIds),
    )?.id;
  }, [allEntries, initialId, myQuartierIds]);
  const id = openedId ?? ownSlotId ?? initialId;

  const cachedEntry = localEntries.find((entry) => entry.id === id);
  const listCachedEntry =
    scheduleList?.find((entry) => entry.id === id) ??
    trpcDirectEntries?.find((entry) => entry.id === id);

  // 3. Check direct tRPC cache for getById or run query
  const directGetById = trpcUtils.schedule.getById.getData({ id });
  const {
    data: fetchedEntry,
    isLoading,
    error,
    isFetched,
  } = trpc.schedule.getById.useQuery(
    { id },
    {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  );

  // Prefer fetched/cached entry
  const entry =
    (fetchedEntry as unknown as CampScheduleEntry | undefined) ??
    (directGetById as unknown as CampScheduleEntry | undefined) ??
    (listCachedEntry as unknown as CampScheduleEntry | undefined) ??
    (cachedEntry as unknown as CampScheduleEntry | undefined);

  // 4. Get course status for admin check
  const { data: courseStatus } = trpc.schedule.getCourseStatus.useQuery(
    { courseId: id },
    {
      enabled: !!entry,
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      /**
       * The status is persisted to IndexedDB, and the default `refetchOnMount` trusts it for
       * five minutes. That is fine for the enrolment counts, which every mutation invalidates -
       * but `isAdmin` is decided by the organiser relationship in the CMS, which changes
       * without any mutation this client ever makes. Somebody just added as an organiser would
       * keep their cached `isAdmin: false` and miss the admin actions and the participant list.
       * Revalidate on every open - it is one small request on a deliberate
       * navigation, and `networkMode: 'online'` still serves the cached value when offline.
       */
      refetchOnMount: 'always',
    },
  );

  // What the block holds for the people running it. `null` for everybody else.
  const { data: leaderNotes } = trpc.schedule.getLeaderNotes.useQuery(
    { id },
    { enabled: !!entry, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false },
  );

  // The block in all its slots: the one shown, and the others listed below it
  const { slotEntry, isOwnSlot, otherSlots, whatComesNext } = useMemo(() => {
    const self = allEntries.find((candidate) => candidate.id === id);
    if (self === undefined) {
      return {
        slotEntry: undefined,
        isOwnSlot: false,
        otherSlots: [],
        whatComesNext: { next: undefined, nextBlock: undefined },
      };
    }
    // the timeline the block sits on: the user's, or that of the Quartiere the slot is for
    const timeline =
      myQuartierIds.size > 0 ? myQuartierIds : new Set(quartiereOf(self).map(({ id: q }) => q));
    return {
      slotEntry: self,
      isOwnSlot:
        myQuartierIds.size > 0 &&
        quartiereOf(self).length > 0 &&
        isForQuartiere(self, myQuartierIds),
      otherSlots: findOtherSlots(allEntries, self),
      whatComesNext: findWhatComesNext(allEntries, self, timeline),
    };
  }, [allEntries, id, myQuartierIds]);

  // 5. Use shared edit hook
  const {
    isEditing,
    editError,
    editData,
    isAdmin,
    isSaving,
    handleStartEdit,
    handleCancelEdit,
    handleSave,
    setEditData,
  } = useScheduleEdit({
    courseId: id,
    locale,
    courseStatus: courseStatus ?? undefined,
  });

  const navigateToEntry = useCallback((entryId: string): void => {
    setOpenedId(entryId);
    // Update the URL without triggering a Next.js navigation to avoid
    // tearing down the React tree (which breaks TRPCProvider's promise chain)
    // Keep the other parameters: the date and the scope decide what "back" returns to.
    const parameters = new URLSearchParams(globalThis.location.search);
    parameters.set('id', entryId);
    globalThis.history.replaceState(undefined, '', `/app/schedule?${parameters.toString()}`);
  }, []);

  // The block was the first page this document loaded, from a shared link or a push: there is
  // nothing in the app to go back to.
  const [isEntryPage] = useState(
    () =>
      typeof performance !== 'undefined' &&
      performance.getEntriesByType('navigation')[0]?.name === globalThis.location.href,
  );

  /**
   * Back to where the block was opened from, the list or a place on the Karte. Where the block
   * is the entry page, `router.back()` would leave the app or land on a blank page, so it goes to
   * the day's list instead.
   */
  const goBack = (): void => {
    if (!isEntryPage) {
      router.back();
      return;
    }
    const parameters = new URLSearchParams(globalThis.location.search);
    parameters.delete('id');
    const query = parameters.toString();
    router.replace(query === '' ? '/app/schedule' : `/app/schedule?${query}`);
  };

  const backButton = (
    <button
      type="button"
      onClick={goBack}
      className={floatingButtonClassName}
      aria-label={labels.back[locale]}
    >
      <ArrowLeft className="h-[22px] w-[22px]" />
    </button>
  );

  // Loading state (only when fetching and no cache)
  if (isLoading && !entry) {
    return (
      <>
        <SetHideHeader value />
        <div className={containerClassName}>
          <div className="absolute inset-x-0 top-0 z-20 flex p-3">{backButton}</div>
          <div className="flex-1 overflow-y-auto">
            <ScheduleDetailSkeleton />
          </div>
        </div>
      </>
    );
  }

  // Error state (only after fetch attempted and no cache)
  if ((isFetched || error) && !entry) {
    return (
      <>
        <SetHideHeader value />
        <div className={cn(containerClassName, 'items-center justify-center p-8 text-center')}>
          <p className="mb-4 text-gray-500">{labels.notFound[locale]}</p>
          <Button onClick={goBack}>{labels.back[locale]}</Button>
        </div>
      </>
    );
  }

  // Fallback loading (shouldn't happen but safety net)
  if (!entry) {
    return (
      <>
        <SetHideHeader value />
        <div className={cn(containerClassName, 'items-center justify-center')}>
          <div className="text-gray-400">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <SetHideHeader value />

      {/* Fills the screen above the bottom navigation, which stays */}
      <div className={containerClassName}>
        {/* Floating over the map: the way back on the left, sharing and the star on the right */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 [&>*]:pointer-events-auto">
          {backButton}
          <ScheduleEditHeaderActions
            entryId={entry.id}
            locale={locale}
            isAdmin={isAdmin}
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}
            buttonClassName={floatingButtonClassName}
            before={
              <ShareLinkButton
                url={`${environmentVariables.NEXT_PUBLIC_APP_HOST_URL}/app/schedule?id=${entry.id}`}
                title={entry.title}
                locale={locale}
                compact
                className={floatingButtonClassName}
              />
            }
          />
        </div>

        {/* keyed by the entry, so another slot or the next block opens at the top */}
        <div key={id} className="flex-1 overflow-x-hidden overflow-y-auto">
          <SafeErrorBoundary
            fallback={
              <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-500">
                <p>{labels.errorLoading[locale]}</p>
                <Button onClick={() => globalThis.location.reload()} className="mt-4">
                  {labels.retry[locale]}
                </Button>
              </div>
            }
          >
            <ScheduleDetailContent
              entry={entry}
              locale={locale}
              isEditing={isEditing}
              isAdmin={isAdmin}
              courseStatus={courseStatus ?? undefined}
              editData={editData}
              onEditDataChange={setEditData}
              editError={editError}
              slotEntry={slotEntry}
              isOwnSlot={isOwnSlot}
              myQuartierIds={myQuartierIds}
              otherSlots={otherSlots}
              whatComesNext={whatComesNext}
              onOpenEntry={navigateToEntry}
              leaderNotes={leaderNotes}
            />
          </SafeErrorBoundary>
        </div>
      </div>
    </>
  );
};
