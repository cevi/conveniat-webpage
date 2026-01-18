'use client';

import { SafeErrorBoundary } from '@/components/error-boundary/safe-error-boundary';
import { AppFooterController } from '@/components/footer/hide-footer-context';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { Button } from '@/components/ui/buttons/button';
import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { ScheduleDetailContent } from '@/features/schedule/components/schedule-detail-content';
import { ScheduleEditHeaderActions } from '@/features/schedule/components/schedule-edit-header-actions';
import { useScheduleEdit } from '@/features/schedule/hooks/use-schedule-edit';
import { trpc } from '@/trpc/client';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { ChevronLeft } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useParams, useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';

const noop = (): void => {};
const emptySubscribe = (): (() => void) => noop;
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

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

const DetailContent: React.FC<{ id: string }> = ({ id }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();

  // 1. Try to find the entry in the list cache first (Offline support via hydration)
  const { data: scheduleList } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const cachedEntry = scheduleList?.find((entry) => entry.id === id);

  // 2. Fetch via TRPC (primary source, enables refresh after edit)
  const {
    data: fetchedEntry,
    isLoading,
    error,
  } = trpc.schedule.getById.useQuery(
    { id },
    {
      enabled: true,
      staleTime: 1000 * 60 * 60,
    },
  );

  // Prefer fetched entry (fresh) over cached entry (may be stale)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  const entry = (fetchedEntry as unknown as CampScheduleEntry) ?? cachedEntry;

  // 3. Get course status to determine if user is admin
  const { data: courseStatus } = trpc.schedule.getCourseStatus.useQuery(
    { courseId: id },
    { enabled: !!entry },
  );

  // 4. Use shared edit hook
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
    courseStatus,
  });

  if (isLoading && !cachedEntry) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (error && !entry) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center text-gray-500">
        <p className="mb-4">{labels.errorLoading[locale]}</p>
        <Button onClick={() => router.back()}>{labels.back[locale]}</Button>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!entry) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center text-gray-500">
        <p className="mb-4">{labels.notFound[locale]}</p>
        <Button onClick={() => router.back()}>{labels.back[locale]}</Button>
      </div>
    );
  }

  return (
    <>
      <SetHideHeader value />
      <AppFooterController hideAppFooter />

      {/* Full-screen container */}
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gray-50">
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
              courseStatus={courseStatus}
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

export const ScheduleDetailPageContent: React.FC<{ id?: string }> = ({ id: propertyId }) => {
  const params = useParams();
  const idParameter = params['id'];
  const id = propertyId ?? (Array.isArray(idParameter) ? idParameter[0] : idParameter);
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const isClient = useSyncExternalStore(emptySubscribe, getSnapshot, getServerSnapshot);

  if (!isClient) return; // Avoid hydration mismatch on initial shell render

  if (!id) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        {labels.notFound[locale]}
      </div>
    );
  }

  return <DetailContent id={id} />;
};
