'use client';

import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { Button } from '@/components/ui/buttons/button';
import { useScheduleEntries } from '@/context/schedule-entries-context';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { ScheduleDetailContent } from '@/features/schedule/components/schedule-detail-content';
import { ScheduleDetailSkeleton } from '@/features/schedule/components/schedule-detail-skeleton';
import { ScheduleEditHeaderActions } from '@/features/schedule/components/schedule-edit-header-actions';
import { useScheduleEdit } from '@/features/schedule/hooks/use-schedule-edit';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ChevronLeft } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type React from 'react';

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

interface ScheduleDetailViewProperties {
  id: string;
}

/**
 * Full-screen schedule detail view.
 * Fetches data via tRPC with offline support from TanStack DB cache.
 */
export const ScheduleDetailView: React.FC<ScheduleDetailViewProperties> = ({ id }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();

  // 1. Try to find the entry in the local TanStack DB cache first (offline support)
  const { entries: localEntries } = useScheduleEntries();
  const cachedEntry = localEntries.find((entry) => entry.id === id);

  // 2. Also check the schedule list cache from tRPC
  const { data: scheduleList } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1 hour - data stays fresh
  });
  const listCachedEntry = scheduleList?.find((entry) => entry.id === id);

  // 3. Fetch via TRPC (primary source, enables refresh after edit)
  const {
    data: fetchedEntry,
    isLoading,
    error,
    isFetched,
  } = trpc.schedule.getById.useQuery(
    { id },
    {
      staleTime: 1000 * 60 * 60, // 1 hour
    },
  );

  // Prefer fetched entry (fresh) over cached entries (may be stale)
  const entry =
    (fetchedEntry as unknown as CampScheduleEntry | undefined) ??
    (listCachedEntry as unknown as CampScheduleEntry | undefined) ??
    (cachedEntry as unknown as CampScheduleEntry | undefined);

  // 4. Get course status for admin check
  const { data: courseStatus } = trpc.schedule.getCourseStatus.useQuery(
    { courseId: id },
    {
      enabled: !!entry,
      staleTime: 1000 * 60 * 60,
    },
  );

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

  // Loading state (only when fetching and no cache)
  if (isLoading && !entry) {
    return (
      <>
        <SetHideHeader value />
        <AppFooterController hideAppFooter />
        <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-gray-50">
          <header className="flex h-16 items-center gap-3 border-b-2 border-gray-200 bg-white px-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label={labels.back[locale]}
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
          </header>
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
        <AppFooterController hideAppFooter />
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
          <p className="mb-4 text-gray-500">{labels.notFound[locale]}</p>
          <Button onClick={() => router.back()}>{labels.back[locale]}</Button>
        </div>
      </>
    );
  }

  // Fallback loading (shouldn't happen but safety net)
  if (!entry) {
    return (
      <>
        <SetHideHeader value />
        <AppFooterController hideAppFooter />
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-gray-50">
          <div className="text-gray-400">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <SetHideHeader value />
      <AppFooterController hideAppFooter />

      {/* Full-screen container */}
      <div className="fixed inset-0 z-100 flex flex-col overflow-hidden bg-gray-50">
        {/* Header */}
        <header className="flex h-16 items-center justify-between gap-3 border-b-2 border-gray-200 bg-white px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label={labels.back[locale]}
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading truncate text-xl font-bold text-gray-900">
                {entry.title}
              </h1>
            </div>
          </div>
          <ScheduleEditHeaderActions
            entryId={entry.id}
            locale={locale}
            isAdmin={isAdmin}
            isEditing={isEditing}
            isSaving={isSaving}
            onStartEdit={handleStartEdit}
            onCancelEdit={handleCancelEdit}
            onSave={handleSave}
          />
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
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
            />
          </SafeErrorBoundary>
        </div>
      </div>
    </>
  );
};
