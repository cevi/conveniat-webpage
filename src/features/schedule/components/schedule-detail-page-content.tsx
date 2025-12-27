'use client';

import { SetHideFooter } from '@/components/footer/hide-footer-context';
import { SetHideHeader } from '@/components/header/hide-header-context';
import { Button } from '@/components/ui/buttons/button';
import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type {
  CampMapAnnotation,
  CampScheduleEntry,
  User,
} from '@/features/payload-cms/payload-types';
import { DetailStarButton } from '@/features/schedule/components/detail-star-button';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { WorkshopAdminActions } from '@/features/schedule/components/workshop-admin-actions';
import { trpc } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { Calendar, ChevronLeft, Clock, MapPin, Users } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSyncExternalStore } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

const noop = (): void => {};
const emptySubscribe = (): (() => void) => noop;
const getSnapshot = (): boolean => true;
const getServerSnapshot = (): boolean => false;

const contactAdminText: StaticTranslationString = {
  de: 'Kontakt mit Organisator',
  en: 'Contact Organiser',
  fr: "Contacter l'organisateur",
};

const labels = {
  location: { de: 'Ort', en: 'Location', fr: 'Lieu' },
  targetGroup: { de: 'Zielgruppe', en: 'Target Group', fr: 'Groupe cible' },
  back: { de: 'Zurück', en: 'Back', fr: 'Retour' },
  retry: { de: 'Erneut versuchen', en: 'Retry', fr: 'Réessayer' },
  notFound: { de: 'Eintrag nicht gefunden', en: 'Entry not found', fr: 'Entrée non trouvée' },
} as const;

const DetailContent: React.FC<{ id: string }> = ({ id }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  const router = useRouter();

  // 1. Try to find the entry in the list cache first (Offline support via hydration)
  const { data: scheduleList } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const cachedEntry = scheduleList?.find((entry) => entry.id === id);

  // 2. If not in cache, fetch directly (Online or deep link fallback)
  const {
    data: fetchedEntry,
    isLoading,
    error,
  } = trpc.schedule.getById.useQuery(
    { id },
    {
      enabled: !cachedEntry,
      staleTime: 1000 * 60 * 60,
    },
  );

  const entry = cachedEntry ?? (fetchedEntry as unknown as CampScheduleEntry);

  if (isLoading && !cachedEntry) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (error ?? (!entry as boolean)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-8 text-center text-gray-500">
        <p className="mb-4">{labels.notFound[locale]}</p>
        <Button onClick={() => router.back()}>{labels.back[locale]}</Button>
      </div>
    );
  }

  const location = entry.location as CampMapAnnotation;
  const organisers = entry.organiser as User[];
  const primaryOrganiser = organisers[0];

  const dateTime = formatScheduleDateTime(locale, entry.timeslot.date, entry.timeslot.time);

  return (
    <>
      <SetHideHeader value />
      <SetHideFooter value />

      {/* Full-screen container */}
      <div className="fixed inset-0 z-[100] flex flex-col overflow-hidden bg-gray-50">
        {/* Header */}
        <header className="flex h-16 items-center justify-between gap-3 border-b-2 border-gray-200 bg-white px-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              href="/app/schedule"
              className="rounded-lg p-2 transition-colors hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5 text-gray-700" />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading truncate text-lg font-semibold text-gray-900">
                {entry.title}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <DetailStarButton entryId={entry.id} />
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <article className="mx-auto w-full max-w-3xl">
            <div className="flex flex-col lg:flex-row">
              {/* Main Content */}
              <div className="flex-1 bg-white p-6">
                <div className="prose prose-gray max-w-none">
                  <LexicalRichTextSection richTextSection={entry.description} />
                </div>

                {/* Admin Actions */}
                <WorkshopAdminActions courseId={entry.id} courseTitle={entry.title} />

                {primaryOrganiser && (
                  <div className="mt-8 border-t-2 border-gray-200 pt-6">
                    <h3 className="mb-4 text-sm font-bold tracking-wider text-gray-400 uppercase">
                      {contactAdminText[locale]}
                    </h3>
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-conveniat-green/10 text-conveniat-green flex h-10 w-10 items-center justify-center rounded-full font-bold">
                          {primaryOrganiser.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{primaryOrganiser.fullName}</div>
                          <div className="text-xs text-gray-500">{primaryOrganiser.email}</div>
                        </div>
                      </div>
                      <ChatLinkButton userId={primaryOrganiser.id} />
                    </div>
                  </div>
                )}
              </div>

              {/* Side Info Bar */}
              <aside className="w-full bg-gray-50/50 p-6 lg:w-80 lg:border-l lg:bg-white">
                <div className="space-y-5">
                  {/* Date & Time */}
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {dateTime.formattedDate}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {entry.timeslot.time}
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <Link
                    href={`/app/map?locationId=${location.id}`}
                    className="-m-2 flex gap-3 rounded-lg p-2 transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="mb-0.5 text-xs font-bold tracking-wide text-gray-400 uppercase">
                        {labels.location[locale]}
                      </div>
                      <div className="group-hover:text-conveniat-green text-sm font-medium text-gray-900">
                        {location.title}
                      </div>
                    </div>
                  </Link>

                  {/* Target Group */}
                  {entry.target_group && (
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 text-xs font-bold tracking-wide text-gray-400 uppercase">
                          {labels.targetGroup[locale]}
                        </div>
                        <div className="text-sm text-gray-700">
                          <LexicalRichTextSection richTextSection={entry.target_group} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Enrollment Action Section */}
                  <div className="border-t-2 border-gray-200 pt-5">
                    <EnrollmentAction courseId={entry.id} />
                  </div>
                </div>
              </aside>
            </div>
          </article>
          <div className="h-8" />
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

  if (!id) return <div>Missing ID</div>;

  return (
    <ErrorBoundary
      fallback={
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <p>Something went wrong loading the schedule entry.</p>
          <Button onClick={() => globalThis.location.reload()}>{labels.retry[locale]}</Button>
        </div>
      }
    >
      <DetailContent id={id} />
    </ErrorBoundary>
  );
};
