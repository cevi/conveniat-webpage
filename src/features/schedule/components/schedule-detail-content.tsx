import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type {
  CampMapAnnotation,
  CampScheduleEntry,
  User,
} from '@/features/payload-cms/payload-types';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { WorkshopAdminActions } from '@/features/schedule/components/workshop-admin-actions';
import { TRPCProvider } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import type React from 'react';

const contactAdminText: StaticTranslationString = {
  de: 'Kontakt mit Organisator',
  en: 'Contact Organiser',
  fr: "Contacter l'organisateur",
};

const labels = {
  location: { de: 'Ort', en: 'Location', fr: 'Lieu' },
  targetGroup: { de: 'Zielgruppe', en: 'Target Group', fr: 'Groupe cible' },
} as const;

interface ScheduleDetailContentProperties {
  entry: CampScheduleEntry;
  locale: Locale;
}

/**
 * Shared content component for schedule details.
 * Used in both the regular page and the intercepting modal.
 */
export const ScheduleDetailContent: React.FC<ScheduleDetailContentProperties> = ({
  entry,
  locale,
}) => {
  const location = entry.location as CampMapAnnotation;
  const organisers = entry.organiser as User[];
  const primaryOrganiser = organisers[0];
  const dateTime = formatScheduleDateTime(locale, entry.timeslot.date, entry.timeslot.time);

  return (
    <TRPCProvider>
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
                  <div className="text-sm font-medium text-gray-900">{dateTime.formattedDate}</div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    {entry.timeslot.time}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div>
                <div className="flex gap-3 px-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="mb-0.5 text-xs font-bold tracking-wide text-gray-400 uppercase">
                      {labels.location[locale]}
                    </div>
                    <div className="text-sm font-medium text-gray-900">{location.title}</div>
                  </div>
                </div>
                <ScheduleMiniMap location={location} />
              </div>

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
              <div className="pt-5">
                <EnrollmentAction courseId={entry.id} />
              </div>
            </div>
          </aside>
        </div>
      </article>

      {/* Bottom padding for safe area */}
      <div className="h-8" />
    </TRPCProvider>
  );
};
