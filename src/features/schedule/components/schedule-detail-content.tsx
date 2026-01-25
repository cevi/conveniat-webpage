import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type {
  CampMapAnnotation,
  CampScheduleEntry,
  User,
} from '@/features/payload-cms/payload-types';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { WorkshopAdminActions } from '@/features/schedule/components/workshop-admin-actions';
import {
  ScheduleStatusProvider,
  useCourseStatus,
} from '@/features/schedule/context/schedule-status-context';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { TRPCProvider } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
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

  if (!isLoading && status && !status.enableEnrolment) {
    return <></>;
  }

  return (
    <div className="border-t border-gray-100 pt-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <UserPlus className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{labels.enrollment[locale]}</h3>
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

/**
 * Shared content component for schedule details.
 * Used in both the regular page and the intercepting modal.
 */
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
  const location = entry.location as CampMapAnnotation;
  const organisers = entry.organiser as User[];
  const dateTime = formatScheduleDateTime(locale, entry.timeslot.date, entry.timeslot.time);
  const isOnline = useOnlineStatus();

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
    <TRPCProvider>
      <ScheduleStatusProvider courseIds={[entry.id]} isOnline={isOnline}>
        <article className="mx-auto w-full max-w-3xl">
          <div className="flex flex-col lg:flex-row">
            {/* Main Content */}
            <div className="flex-1 bg-white p-6">
              {/* Edit Warning */}
              {isEditing && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {labels.editWarning[locale]}
                </div>
              )}

              {/* Error Banner */}
              {editError && (
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {editError}
                </div>
              )}

              {/* Description */}
              {isEditing && editData ? (
                <MarkdownEditor
                  label={labels.description[locale]}
                  value={editData.description}
                  onChange={handleDescriptionChange}
                  rows={6}
                  placeholder="..."
                />
              ) : (
                <div className="prose prose-gray max-w-none">
                  <LexicalRichTextSection richTextSection={entry.description} />
                </div>
              )}

              {/* Admin Actions - Hide when editing */}
              {isAdmin && !isEditing && (
                <WorkshopAdminActions
                  courseId={entry.id}
                  courseTitle={entry.title}
                  isAdmin={isAdmin}
                  courseStatus={courseStatus}
                />
              )}

              {/* Contact Organisers - Hide when editing */}
              {organisers.length > 0 && !isEditing && (
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {contactAdminText[locale]}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {organisers.map((organiser) => (
                      <div
                        key={organiser.id}
                        className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-conveniat-green/10 text-conveniat-green flex h-10 w-10 items-center justify-center rounded-full font-bold">
                            {organiser.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{organiser.fullName}</div>
                            <div className="text-xs text-gray-500">{organiser.email}</div>
                          </div>
                        </div>
                        <ChatLinkButton userId={organiser.id} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Side Info Bar */}
            <aside className="w-full bg-gray-50/50 p-6 lg:w-80 lg:border-l lg:bg-white">
              <div className="space-y-6">
                {/* Date & Time */}
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">
                      {dateTime.formattedDate}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <Clock className="h-3.5 w-3.5" />
                      {entry.timeslot.time}
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-gray-500">
                        {labels.location[locale]}
                      </div>
                      <div className="text-sm font-semibold text-gray-900">{location.title}</div>
                    </div>
                  </div>
                  <ScheduleMiniMap location={location} />
                </div>

                {/* Target Group */}
                {(entry.target_group || isEditing) && (
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-gray-500">
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
                        <div className="text-sm text-gray-700">
                          <LexicalRichTextSection richTextSection={entry.target_group} />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Max Participants (only when editing) */}
                {isEditing && editData && (
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="block text-xs font-semibold text-gray-500">
                        {labels.maxParticipants[locale]}
                      </label>
                      <input
                        type="number"
                        min={courseStatus?.enrolledCount ?? 0}
                        value={editData.maxParticipants || ''}
                        onChange={handleMaxParticipantsChange}
                        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                        placeholder="0 = unlimited"
                      />
                      {courseStatus && courseStatus.enrolledCount > 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                          Min: {courseStatus.enrolledCount} ({courseStatus.enrolledCount} enrolled)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Enrollment Action Section - Hide when editing */}
                {!isEditing && <EnrollmentSection courseId={entry.id} locale={locale} />}
              </div>
            </aside>
          </div>
        </article>

        {/* Bottom padding for safe area */}
        <div className="h-8" />
      </ScheduleStatusProvider>
    </TRPCProvider>
  );
};
