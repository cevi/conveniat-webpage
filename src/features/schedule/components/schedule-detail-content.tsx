import { ChatLinkButton } from '@/components/ui/buttons/chat-link-button';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import type { CampScheduleEntry, User } from '@/features/payload-cms/payload-types';
import type { LeaderNotes } from '@/features/schedule/api/viewer';
import { EnrollmentAction } from '@/features/schedule/components/enrollment-action';
import { ParticipantList } from '@/features/schedule/components/participant-list';
import type { DetailTab } from '@/features/schedule/components/schedule-detail-tabs';
import {
  DetailTabBar,
  leaderTabsOf,
  MaterialTab,
  SafetyTab,
  StepsTab,
} from '@/features/schedule/components/schedule-detail-tabs';
import { ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { WorkshopAdminActions } from '@/features/schedule/components/workshop-admin-actions';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import {
  ScheduleStatusProvider,
  useCourseStatus,
} from '@/features/schedule/context/schedule-status-context';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import { quartiereOf, slotOf } from '@/features/schedule/utils/programme-utils';
import { formatDuration } from '@/features/schedule/utils/time-utils';
import { useOnlineStatus } from '@/hooks/use-online-status';

import type { Locale, StaticTranslationString } from '@/types/types';
import { formatScheduleDateTime } from '@/utils/format-schedule-date-time';
import { formatUserFullName } from '@/utils/format-user-name';
import { cn } from '@/utils/tailwindcss-override';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  MapPin,
  MessageCircle,
  UserPlus,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';

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
  /** the same block in the slots of the other Quartiere, on the same day */
  otherSlots?: CampScheduleEntryFrontendType[];
  /** what the block holds for the people running it; absent for everybody else */
  leaderNotes?: LeaderNotes | null | undefined;
}

/** One line of the block's key facts: an icon, the fact and a smaller line under it. */
const Fact: React.FC<{
  icon: typeof Clock;
  title: React.ReactNode;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
  <div className="flex items-start gap-3 border-b border-gray-100 px-3.5 py-2.5 last:border-b-0">
    <Icon className="text-conveniat-green mt-0.5 h-4 w-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <div className="font-body text-sm font-medium text-gray-900">{title}</div>
      {children}
    </div>
  </div>
);

export const ScheduleDetailContent: React.FC<ScheduleDetailContentProperties> = ({
  entry,
  locale,
  isEditing = false,
  isAdmin = false,
  courseStatus,
  editData,
  onEditDataChange,
  editError,
  otherSlots = [],
  leaderNotes,
}) => {
  const [selectedTab, setSelectedTab] = useState<DetailTab>('overview');
  const location = resolveLocation(entry.location);
  const organisers = (entry.organiser ?? []) as User[];
  const dateTime = formatScheduleDateTime(locale, entry.timeslot.date, entry.timeslot.time);
  const isOnline = useOnlineStatus();
  const accent = getCategoryAccent(entry.category);
  const form =
    typeof entry.form === 'string' ? programmeLabels.form[entry.form][locale] : undefined;
  const label = [accent.label, form].filter((part) => part !== undefined && part !== '');

  const slot = slotOf(entry);
  const steps = entry.steps ?? [];
  const bring = entry.bring ?? [];
  const quartiere = quartiereOf(entry).filter(({ name }) => name !== undefined);

  // Editing happens on the overview, and a tab can vanish under the reader when the block changes.
  const tabs: DetailTab[] = [
    'overview',
    ...(steps.length > 0 && slot !== undefined ? (['steps'] as const) : []),
    ...leaderTabsOf(leaderNotes),
  ];
  const activeTab = !isEditing && tabs.includes(selectedTab) ? selectedTab : 'overview';

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

        {/* Header: category, title and what the block is about */}
        <header className="space-y-2 px-1">
          {label.length > 0 && (
            <div
              className={cn(
                'flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase',
                accent.text,
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', accent.bar)} />
              {label.join(' · ')}
            </div>
          )}
          <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-gray-900">
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
        </header>

        {tabs.length > 1 && !isEditing && (
          <DetailTabBar
            tabs={tabs}
            active={activeTab}
            onSelect={setSelectedTab}
            accentText={accent.text}
            locale={locale}
          />
        )}

        {activeTab === 'steps' && slot !== undefined && (
          <StepsTab
            steps={steps}
            startMinutes={slot.start}
            accentText={accent.text}
            locale={locale}
          />
        )}
        {activeTab === 'material' && leaderNotes && (
          <MaterialTab notes={leaderNotes} locale={locale} />
        )}
        {activeTab === 'safety' && leaderNotes && <SafetyTab notes={leaderNotes} locale={locale} />}

        {activeTab === 'overview' && (
          <>
            {/* Key facts: when, where, who */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs">
              <Fact icon={Clock} title={entry.timeslot.time.replace(' - ', ' – ')}>
                <div className="font-body text-xs text-gray-500">
                  {[
                    dateTime.formattedDate,
                    slot !== undefined && slot.end > slot.start
                      ? formatDuration(slot.end - slot.start)
                      : undefined,
                  ]
                    .filter((part) => part !== undefined)
                    .join(' · ')}
                </div>
              </Fact>

              {location !== undefined && (
                <Fact
                  icon={MapPin}
                  title={
                    <Link
                      href={`/app/map?locationId=${location.id}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span>
                        {location.title}
                        <span className="block text-xs font-normal text-gray-500">
                          {programmeLabels.showOnMap[locale]}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                    </Link>
                  }
                >
                  <div className="mt-2 overflow-hidden rounded-xl border border-gray-100">
                    <ScheduleMiniMap location={location} />
                  </div>
                </Fact>
              )}

              {(quartiere.length > 0 || otherSlots.length > 0) && (
                <Fact
                  icon={Users}
                  title={
                    quartiere.length > 0
                      ? quartiere.map(({ name }) => name).join(', ')
                      : programmeLabels.wholeCamp[locale]
                  }
                >
                  {otherSlots.length > 0 && (
                    <div className="font-body mt-0.5 text-xs text-gray-500">
                      <div>{programmeLabels.otherSlots[locale]}:</div>
                      {otherSlots.map((other) => (
                        <div key={other.id}>
                          {other.timeslot.time.replace(' - ', ' – ')}
                          {quartiereOf(other).some(({ name }) => name !== undefined) &&
                            ` · ${quartiereOf(other)
                              .map(({ name }) => name)
                              .filter((name) => name !== undefined)
                              .join(', ')}`}
                        </div>
                      ))}
                    </div>
                  )}
                </Fact>
              )}

              {/* Target Group */}
              {(entry.target_group || isEditing) && (
                <Fact icon={Users} title={labels.targetGroup[locale]}>
                  {isEditing && editData ? (
                    <MarkdownEditor
                      value={editData.targetGroup}
                      onChange={handleTargetGroupChange}
                      rows={3}
                      placeholder="..."
                    />
                  ) : undefined}
                  {!isEditing && entry.target_group && (
                    <div className="font-body mt-0.5 text-sm text-gray-600">
                      <LexicalRichTextSection
                        richTextSection={entry.target_group}
                        locale={locale}
                      />
                    </div>
                  )}
                </Fact>
              )}

              {/* Max Participants (when editing) */}
              {isEditing && editData && (
                <Fact icon={Users} title={labels.maxParticipants[locale]}>
                  <input
                    type="number"
                    aria-label={labels.maxParticipants[locale]}
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
                </Fact>
              )}
            </div>

            {bring.length > 0 && !isEditing && (
              <section className="px-1">
                <h3 className="font-heading text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                  {programmeLabels.bring[locale]}
                </h3>
                <ul className="mt-2 grid grid-cols-2 gap-1.5">
                  {bring.map(({ id, item }, index) => (
                    <li
                      key={id ?? index}
                      className="flex items-center gap-2 rounded-xl bg-gray-100 px-2.5 py-2 text-[13px] text-gray-700"
                    >
                      <Check className="text-conveniat-green h-3.5 w-3.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

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

            {/* Participant List (organisers only, when enrolment is enabled & not editing) */}
            {!isEditing && isAdmin && (
              <ParticipantList courseId={entry.id} courseStatus={courseStatus} />
            )}

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
                  {organisers.map((organiser) => {
                    const displayName = formatUserFullName(organiser.fullName, organiser.nickname);

                    return (
                      <div
                        key={organiser.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3.5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          <PersonAvatar
                            seed={organiser.id}
                            name={organiser.fullName}
                            className="h-10 w-10 text-sm font-bold shadow-xs"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-body truncate text-sm font-semibold text-gray-900">
                              {displayName}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <ChatLinkButton userId={organiser.id} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </article>
    </ScheduleStatusProvider>
  );
};
