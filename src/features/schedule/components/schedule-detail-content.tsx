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
import { mapCenterOf, ScheduleMiniMap } from '@/features/schedule/components/schedule-mini-map';
import { WorkshopAdminActions } from '@/features/schedule/components/workshop-admin-actions';
import { programmeLabels } from '@/features/schedule/constants/schedule-labels';
import {
  ScheduleStatusProvider,
  useCourseStatus,
} from '@/features/schedule/context/schedule-status-context';
import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { getCategoryAccent } from '@/features/schedule/utils/category-utils';
import { resolveLocation } from '@/features/schedule/utils/location-utils';
import {
  isDescriptionRedundant,
  quartiereOf,
  quartierNicknameOf,
  shortQuartierName,
  slotOf,
} from '@/features/schedule/utils/programme-utils';
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
  Target,
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
  /** the slot of the block the facts are about: the user's own, else the one opened */
  slotEntry?: CampScheduleEntryFrontendType | undefined;
  /** `slotEntry` is the slot of the user's Quartier */
  isOwnSlot?: boolean;
  /** the user's Quartiere, filled in among the block's */
  myQuartierIds?: ReadonlySet<string>;
  /** the other slots of the same block on the same day */
  otherSlots?: CampScheduleEntryFrontendType[];
  /** what comes after the block on its own timeline: the next stop and the next block */
  whatComesNext?: {
    next: CampScheduleEntryFrontendType | undefined;
    nextBlock: CampScheduleEntryFrontendType | undefined;
  };
  /** opens another entry in place: another slot, or the block that comes next */
  onOpenEntry?: (entryId: string) => void;
  /** what the block holds for the people running it; absent for everybody else */
  leaderNotes?: LeaderNotes | null | undefined;
}

/** One row of the facts card: an icon on a soft tile, the fact and a smaller line under it. */
const Fact: React.FC<{
  icon: typeof Clock;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}> = ({ icon: Icon, title, sub, href, children }) => {
  const body = (
    <>
      <span className="text-conveniat-green flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#EEF3EE]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        {title !== undefined && (
          <div className="text-[15px] leading-5 font-semibold text-green-900">{title}</div>
        )}
        {sub !== undefined && (
          <div className="mt-px text-[13px] leading-[18px] text-green-500">{sub}</div>
        )}
        {children}
      </div>
      {href !== undefined && (
        <ChevronRight className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />
      )}
    </>
  );
  const className =
    'relative flex min-h-[60px] items-center gap-3 px-3.5 py-2.5 not-first:before:absolute not-first:before:top-0 not-first:before:right-0 not-first:before:left-16 not-first:before:h-px not-first:before:bg-green-100';
  return href === undefined ? (
    <div className={className}>{body}</div>
  ) : (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
};

/** "Q5 Greif", filled when it is the user's own Quartier. */
const QuartierChip: React.FC<{ name: string | undefined; isMine: boolean }> = ({
  name,
  isMine,
}) => (
  <span
    className={cn(
      'inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[13px]',
      isMine ? 'bg-conveniat-green text-white' : 'bg-[#E0E6E1] text-green-900',
    )}
  >
    <b className="font-bold">{shortQuartierName(name)}</b>
    {quartierNicknameOf(name) !== shortQuartierName(name) && quartierNicknameOf(name)}
  </span>
);

const startOf = (entry: Pick<CampScheduleEntryFrontendType, 'timeslot'>): string =>
  entry.timeslot.time.split(' - ')[0] ?? '';

/**
 * "Danach": the next stop on the block's own timeline, and the block after it when the next stop
 * is a meal, which has no page of its own. Leads to that block.
 */
const WhatComesNextCard: React.FC<{
  next: CampScheduleEntryFrontendType;
  nextBlock: CampScheduleEntryFrontendType | undefined;
  locale: Locale;
  /** wraps the card in a link to the next block, or leaves it as it is */
  link: (content: React.ReactNode, className: string) => React.ReactNode;
}> = ({ next, nextBlock, locale, link }) => {
  const className = 'mt-2 flex min-h-16 items-center gap-3 rounded-[14px] bg-[#EEF1EE] px-3.5 py-3';
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold tracking-[0.08em] text-green-700 uppercase">
          {programmeLabels.afterwards[locale]}
        </div>
        <div className="mt-0.5 truncate text-[15px] font-semibold text-green-900">
          <span className="tabular-nums">{startOf(next)}</span> {next.title}
          {nextBlock !== undefined && nextBlock.id !== next.id && (
            <span className="font-normal text-green-700">
              {' · '}
              {programmeLabels.thenNext[locale].replace('{{title}}', nextBlock.title)}
            </span>
          )}
        </div>
      </div>
      {nextBlock !== undefined && (
        <ChevronRight className="h-5 w-5 shrink-0 text-green-700" aria-hidden="true" />
      )}
    </>
  );
  return <>{link(content, className) ?? <div className={className}>{content}</div>}</>;
};

export const ScheduleDetailContent: React.FC<ScheduleDetailContentProperties> = ({
  entry,
  locale,
  isEditing = false,
  isAdmin = false,
  courseStatus,
  editData,
  onEditDataChange,
  editError,
  slotEntry,
  isOwnSlot = false,
  myQuartierIds = new Set<string>(),
  otherSlots = [],
  whatComesNext,
  onOpenEntry,
  leaderNotes,
}) => {
  const [selectedTab, setSelectedTab] = useState<DetailTab>('overview');
  const location = resolveLocation(entry.location);
  const organisers = (entry.organiser ?? []) as User[];
  const isOnline = useOnlineStatus();
  const accent = getCategoryAccent(entry.category);
  // guarded: a phone can restore a form this version does not know
  const form = (programmeLabels.form as Record<string, Record<Locale, string> | undefined>)[
    entry.form ?? ''
  ]?.[locale];
  const label = [accent.label, form].filter((part) => part !== undefined && part !== '');

  // the facts are about the user's own slot of the block, where they have one
  const shown = slotEntry ?? entry;
  const slot = slotOf(shown);
  // "So., 25. Juli" reads "So, 25. Juli" in a line that already has its separators
  const date = formatScheduleDateTime(
    locale,
    shown.timeslot.date,
    shown.timeslot.time,
  ).formattedDate.replace(/^(\p{L}+)\.,/u, '$1,');
  const steps = entry.steps ?? [];
  const bring = entry.bring ?? [];
  const quartiere = quartiereOf(shown).filter(({ name }) => name !== undefined);
  const hasMap = location !== undefined && mapCenterOf(location) !== undefined;
  const showDescription = isEditing || !isDescriptionRedundant(entry.description, entry.title);

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

  /** a link that opens another entry in place, keeping the date and the view in the URL */
  const entryLink = (
    target: CampScheduleEntryFrontendType,
    className: string,
    children: React.ReactNode,
  ): React.ReactNode => (
    <a
      href={`/app/schedule?id=${target.id}`}
      onClick={(event) => {
        if (onOpenEntry === undefined) return;
        event.preventDefault();
        onOpenEntry(target.id);
      }}
      className={className}
    >
      {children}
    </a>
  );

  const next = whatComesNext?.next;
  const nextBlock = whatComesNext?.nextBlock;

  return (
    <ScheduleStatusProvider courseIds={[entry.id]} isOnline={isOnline}>
      <article className="mx-auto w-full max-w-xl overflow-x-hidden pb-6">
        {/* Where it is, first: the question people open a block with */}
        {location !== undefined && hasMap && (
          <ScheduleMiniMap
            location={location}
            interactive={false}
            showOpenInMap={false}
            zoom={16}
            // the panel below overlaps the map's bottom edge; the swisstopo credit stays above it
            className="mt-0 h-[220px] rounded-none border-0 [&_.maplibregl-ctrl-bottom-right]:bottom-5"
          />
        )}

        <div
          className={cn(
            'relative space-y-4 bg-[#f8fafc] px-4 pb-4 sm:px-6',
            // without a map, the floating buttons sit over the panel and need the room
            hasMap ? '-mt-4 rounded-t-[18px] pt-5' : 'pt-[72px]',
          )}
        >
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
          <header className="space-y-2">
            {label.length > 0 && (
              <div
                className={cn(
                  'flex items-center gap-2 text-xs font-bold tracking-[0.08em] uppercase',
                  accent.text,
                )}
              >
                <span className={cn('h-2 w-2 rounded-full', accent.bar)} />
                {label.join(' · ')}
              </div>
            )}
            <h1 className="font-heading text-[28px] leading-[1.15] font-extrabold text-[#2F3B33]">
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
              showDescription && (
                <div className="prose prose-gray max-w-none text-base leading-relaxed text-green-700">
                  <LexicalRichTextSection richTextSection={entry.description} locale={locale} />
                </div>
              )
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
          {activeTab === 'safety' && leaderNotes && (
            <SafetyTab notes={leaderNotes} locale={locale} />
          )}

          {activeTab === 'overview' && (
            <>
              {/* When, where and who */}
              <div className="overflow-hidden rounded-[14px] border border-green-100 bg-white">
                <Fact
                  icon={Clock}
                  title={
                    <span className="tabular-nums">
                      {date !== '' && `${date} · `}
                      {shown.timeslot.time.replace(' - ', '–')}
                    </span>
                  }
                  sub={[
                    slot !== undefined && slot.end > slot.start
                      ? formatDuration(slot.end - slot.start)
                      : undefined,
                    isOwnSlot ? programmeLabels.ownSlot[locale] : undefined,
                  ]
                    .filter((part) => part !== undefined)
                    .join(' · ')}
                />

                {location !== undefined && (
                  <Fact
                    icon={MapPin}
                    title={location.title}
                    sub={programmeLabels.showOnMap[locale]}
                    href={`/app/map?locationId=${location.id}`}
                  />
                )}

                {quartiere.length > 0 && (
                  <Fact icon={Users}>
                    <div
                      className="flex flex-wrap gap-1.5"
                      aria-label={programmeLabels.quartiere[locale]}
                    >
                      {quartiere.map(({ id, name }) => (
                        <QuartierChip key={id} name={name} isMine={myQuartierIds.has(id)} />
                      ))}
                    </div>
                  </Fact>
                )}

                {/* Target Group */}
                {(entry.target_group || isEditing) && (
                  <Fact icon={Target} title={labels.targetGroup[locale]}>
                    {isEditing && editData ? (
                      <MarkdownEditor
                        value={editData.targetGroup}
                        onChange={handleTargetGroupChange}
                        rows={3}
                        placeholder="..."
                      />
                    ) : undefined}
                    {!isEditing && entry.target_group && (
                      <div className="font-body mt-0.5 text-sm text-green-700">
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

              {/* The same block for the other Quartiere */}
              {otherSlots.length > 0 && !isEditing && (
                <section>
                  <h2 className="text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
                    {programmeLabels.otherTimeSlots[locale]}
                  </h2>
                  <ul className="mt-2 space-y-1.5">
                    {otherSlots.map((other) => (
                      <li key={other.id}>
                        {entryLink(
                          other,
                          'flex min-h-11 items-center gap-1.5 rounded-xl bg-[#EEF1EE] px-3.5 py-2 text-sm text-green-900',
                          <>
                            <b className="font-semibold tabular-nums">
                              {other.timeslot.time.replace(' - ', '–')}
                            </b>
                            {quartiereOf(other)
                              .filter(({ name }) => name !== undefined)
                              .map(({ id, name }) => (
                                <span key={id}>
                                  · {shortQuartierName(name)} {quartierNicknameOf(name)}
                                </span>
                              ))}
                          </>,
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {bring.length > 0 && !isEditing && (
                <section>
                  <h2 className="text-xs font-bold tracking-[0.08em] text-green-700 uppercase">
                    {programmeLabels.bring[locale]}
                  </h2>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {bring.map(({ id, item }, index) => (
                      <li
                        key={id ?? index}
                        className="flex items-center gap-1.5 rounded-full border border-[#D5DBD6] bg-white px-3 py-1.5 text-sm text-green-900"
                      >
                        <Check
                          className="text-conveniat-green h-4 w-4 shrink-0"
                          aria-hidden="true"
                        />
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
                      const displayName = formatUserFullName(
                        organiser.fullName,
                        organiser.nickname,
                      );

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

          {/* What comes after it on the own timeline, and the way to the next block */}
          {next !== undefined && !isEditing && (
            <WhatComesNextCard
              next={next}
              nextBlock={nextBlock}
              locale={locale}
              link={(content, className) =>
                nextBlock === undefined ? undefined : entryLink(nextBlock, className, content)
              }
            />
          )}
        </div>
      </article>
    </ScheduleStatusProvider>
  );
};
