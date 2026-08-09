import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { CampScheduleEntry, User } from '@/features/payload-cms/payload-types';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { WorkshopAdminActions } from '@/features/schedule/components/workshop-admin-actions';
import {
  ScheduleStatusProvider,
  useCourseStatus,
} from '@/features/schedule/context/schedule-status-context';
import { getCategoryDisplayData } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { useOnlineStatus } from '@/hooks/use-online-status';

import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  MessageCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';

const contactAdminText: StaticTranslationString = {
  de: 'Kontakt mit Organisator',
  en: 'Contact Organiser',
  fr: "Contacter l'organisateur",
};

const labels = {
  location: { de: 'Ort', en: 'Location', fr: 'Lieu' },
  targetGroup: { de: 'Zielgruppe', en: 'Target Group', fr: 'Groupe cible' },
  description: { de: 'Beschreibung', en: 'Description', fr: 'Description' },
  maxParticipants: { de: 'Max. Teilnehmer', en: 'Max Participants', fr: 'Participants max.' },
  editWarning: {
    de: 'Formatierungen können beim Speichern vereinfacht werden.',
    en: 'Formatting may be simplified when saving.',
    fr: "Le formatage peut être simplifié lors de l'enregistrement.",
  },
  dateTime: { de: 'Datum & Zeit', en: 'Date & Time', fr: 'Date & Heure' },
  enrollment: { de: 'Anmeldung', en: 'Enrollment', fr: 'Inscription' },
} as const;

const EnrollmentSection: React.FC<{
  courseId: string;
  locale: Locale;
}> = ({ courseId, locale }) => {
  const { status, isLoading } = useCourseStatus(courseId);

  if (isLoading || !status?.enableEnrolment) {
    return <></>;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-2">
        <div className="bg-conveniat-green/10 text-conveniat-green flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold">
          <UserPlus className="h-4 w-4" />
        </div>
        <h3 className="font-heading text-xs font-semibold tracking-wider text-gray-700 uppercase">
          {labels.enrollment[locale]}
        </h3>
      </div>
      <EnrollmentAction courseId={courseId} />
    </div>
  );
};

interface EditData {
  description: string;
  targetGroup: string;
  maxParticipants: number;
}

interface CourseStatus {
  enrolledCount: number;
  maxParticipants: number | undefined;
  isEnrolled: boolean;
  isAdmin: boolean;
  enableEnrolment: boolean | null | undefined;
  hideList: boolean | null | undefined;
  chatId: string | undefined;
  participants: { uuid: string; name: string }[];
  descriptionMarkdown: string | undefined;
  targetGroupMarkdown: string | undefined;
}

interface ScheduleDetailContentProperties {
  entry: CampScheduleEntry;
  locale: Locale;
  isEditing?: boolean;
  isAdmin?: boolean;
  courseStatus?: CourseStatus | undefined;
  editData?: EditData;
  onEditDataChange?: Dispatch<SetStateAction<EditData>>;
  editError?: string | undefined;
}

export const ScheduleDetailContent: React.FC<ScheduleDetailContentProperties> = ({
  entry,
  locale,
  isEditing = false,
  isAdmin = false,
  courseStatus,
  editData,
  onEditDataChange,
  editError,
}) => {
  const location = resolveLocation(entry.location);
  const organisers = (entry.organiser ?? []) as User[];
  const dateTime = formatScheduleDateTime(locale, entry.timeslot.date, entry.timeslot.time);
  const isOnline = useOnlineStatus();
  const { label: categoryLabel, className: categoryClassName } = getCategoryDisplayData(
    entry.category,
  );

  const handleDescriptionChange = (value: string): void => {
    onEditDataChange?.((previous) => ({ ...previous, description: value }));
  };

  const handleTargetGroupChange = (value: string): void => {
    onEditDataChange?.((previous) => ({ ...previous, targetGroup: value }));
  };

  const handleMaxParticipantsChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const value = Number.parseInt(event.target.value, 10) || 0;
    onEditDataChange?.((previous) => ({ ...previous, maxParticipants: value }));
  };

  return (
    <ScheduleStatusProvider courseIds={[entry.id]} isOnline={isOnline}>
      <article className="mx-auto w-full max-w-xl space-y-4 overflow-x-hidden p-4 pb-24 sm:p-6">
        {/* Edit Warning Banner */}
        {isEditing && (
          <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-800 shadow-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            {labels.editWarning[locale]}
          </div>
        )}

        {/* Error Banner */}
        {editError && (
          <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 shadow-xs">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
            {editError}
          </div>
        )}

        {/* Hero Header Card */}
        <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          {categoryLabel && (
            <div>
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase',
                  categoryClassName,
                )}
              >
                {categoryLabel}
              </span>
            </div>
          )}
          <h1 className="font-heading text-xl leading-snug font-bold tracking-tight text-gray-900">
            {entry.title}
          </h1>
          {isEditing && editData ? (
            <MarkdownEditor
              label={labels.description[locale]}
              value={editData.description}
              onChange={handleDescriptionChange}
              rows={6}
              placeholder="..."
            />
          ) : (
            <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-600">
              <LexicalRichTextSection richTextSection={entry.description} locale={locale} />
            </div>
          )}
        </div>

        {/* Date, Time & Location Card */}
        <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <div className="bg-conveniat-green/10 text-conveniat-green flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="font-body text-xs font-medium text-gray-400">
                {labels.dateTime[locale]}
              </div>
              <div className="font-heading text-sm font-bold text-gray-900">
                {dateTime.formattedDate}
              </div>
              <div className="font-body text-conveniat-green flex items-center gap-1 text-xs font-semibold">
                <Clock className="h-3.5 w-3.5" />
                {entry.timeslot.time} Uhr
              </div>
            </div>
          </div>

          {location !== undefined && (
            <>
              <div className="border-t border-gray-100" />

              {/* Location & Mini Map */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-conveniat-green/10 text-conveniat-green flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-body text-xs font-medium text-gray-400">
                      {labels.location[locale]}
                    </div>
                    <div className="font-heading text-sm font-bold text-gray-900">
                      {location.title}
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-100 shadow-2xs">
                  <ScheduleMiniMap location={location} />
                </div>
              </div>
            </>
          )}

          {/* Target Group */}
          {(entry.target_group || isEditing) && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex items-start gap-3">
                <div className="bg-conveniat-green/10 text-conveniat-green flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-body text-xs font-medium text-gray-400">
                    {labels.targetGroup[locale]}
                  </div>
                  {isEditing && editData ? (
                    <MarkdownEditor
                      value={editData.targetGroup}
                      onChange={handleTargetGroupChange}
                      rows={3}
                      placeholder="..."
                    />
                  ) : undefined}
                  {!isEditing && entry.target_group && (
                    <div className="font-body mt-0.5 text-sm font-medium text-gray-800">
                      <LexicalRichTextSection
                        richTextSection={entry.target_group}
                        locale={locale}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Max Participants (when editing) */}
          {isEditing && editData && (
            <>
              <div className="border-t border-gray-100" />
              <div className="flex items-start gap-3">
                <div className="bg-conveniat-green/10 text-conveniat-green flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl font-bold shadow-xs">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <label className="font-body text-xs font-medium text-gray-400">
                    {labels.maxParticipants[locale]}
                  </label>
                  <input
                    type="number"
                    min={courseStatus?.enrolledCount ?? 0}
                    value={editData.maxParticipants || ''}
                    onChange={handleMaxParticipantsChange}
                    className="font-body focus:border-conveniat-green focus:ring-conveniat-green/20 mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:outline-hidden"
                    placeholder="0 = unbegrenzt"
                  />
                  {courseStatus && courseStatus.enrolledCount > 0 && (
                    <p className="font-body mt-1 text-xs text-gray-500">
                      Min: {courseStatus.enrolledCount} ({courseStatus.enrolledCount} angemeldet)
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Admin Actions (when admin & not editing) */}
        {isAdmin && !isEditing && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
            <WorkshopAdminActions
              courseId={entry.id}
              courseTitle={entry.title}
              isAdmin={isAdmin}
              courseStatus={courseStatus}
            />
          </div>
        )}

        {/* Enrollment Section (when enabled & not editing) */}
        {!isEditing && <EnrollmentSection courseId={entry.id} locale={locale} />}

        {/* Contact Organisers Section */}
        {organisers.length > 0 && !isEditing && (
          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="bg-conveniat-green/10 text-conveniat-green flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold">
                <MessageCircle className="h-4 w-4" />
              </div>
              <h3 className="font-heading text-xs font-semibold tracking-wider text-gray-700 uppercase">
                {contactAdminText[locale]}
              </h3>
            </div>
            <div className="space-y-2.5">
              {organisers.map((organiser) => (
                <div
                  key={organiser.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="bg-conveniat-green font-heading flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-xs">
                      {organiser.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-body truncate text-sm font-semibold text-gray-900">
                        {organiser.fullName}
                      </div>
                      <div className="font-body truncate text-xs text-gray-500">
                        {organiser.email}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ChatLinkButton userId={organiser.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </ScheduleStatusProvider>
  );
};
