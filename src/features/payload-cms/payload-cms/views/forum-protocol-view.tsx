import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import prisma from '@/lib/db/prisma';
import { FORUM_POST_STATUSES, forumCapacityLabel, forumStatusLabel } from '@/lib/forum-shared';
import type { ForumActorCapacity, ForumAuditAction, Prisma } from '@/lib/prisma/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter, SetStepNav } from '@payloadcms/ui';
import { redirect } from 'next/navigation';
import type { AdminViewServerProps } from 'payload';
import type React from 'react';

const PAGE_SIZE = 100;

const title: StaticTranslationString = {
  de: 'Forum-Protokoll',
  en: 'Forum protocol',
  fr: 'Protocole du forum',
};

const intro: StaticTranslationString = {
  de: 'Jede Änderung an Beiträgen, die nicht von der Person selbst stammt: durch das Kernteam eines Themas, das Piket im Dienst und beauftragte Personen. Das Protokoll lässt sich nicht bearbeiten oder löschen; eine rückgängig gemachte Änderung ist ein neuer Eintrag.',
  en: 'Every change to posts not made by their author: by the core team of a topic, the piket on duty and assigned helpers. The protocol cannot be edited or deleted; an undone change is a new entry.',
  fr: 'Chaque modification de publications qui ne vient pas de leur auteur : par l’équipe centrale d’un thème, le piquet de service et les personnes mandatées. Le protocole ne peut être ni modifié ni supprimé ; une modification annulée est une nouvelle entrée.',
};

const actionLabel: Record<ForumAuditAction, StaticTranslationString> = {
  STATUS_CHANGED: { de: 'Status', en: 'Status', fr: 'Statut' },
  PINNED: { de: 'Angeheftet', en: 'Pinned', fr: 'Épinglé' },
  UNPINNED: { de: 'Nicht mehr angeheftet', en: 'Unpinned', fr: 'Désépinglé' },
  ANSWER_MARKED: { de: 'Antwort markiert', en: 'Answer marked', fr: 'Réponse marquée' },
  ANSWER_UNMARKED: { de: 'Antwort entfernt', en: 'Answer unmarked', fr: 'Réponse retirée' },
  MERGED: { de: 'Zusammengeführt', en: 'Merged', fr: 'Fusionné' },
  UNMERGED: { de: 'Zusammenführung aufgehoben', en: 'Unmerged', fr: 'Fusion annulée' },
  DELETED: { de: 'Gelöscht', en: 'Deleted', fr: 'Supprimé' },
  ASSIGNED: { de: 'Beauftragt', en: 'Assigned', fr: 'Mandaté' },
  ASSIGNMENT_ENDED: {
    de: 'Auftrag zurückgezogen',
    en: 'Assignment withdrawn',
    fr: 'Mission retirée',
  },
};

const labels = {
  time: { de: 'Zeit', en: 'Time', fr: 'Heure' },
  person: { de: 'Person', en: 'Person', fr: 'Personne' },
  capacity: { de: 'Als', en: 'As', fr: 'En tant que' },
  action: { de: 'Aktion', en: 'Action', fr: 'Action' },
  post: { de: 'Beitrag', en: 'Post', fr: 'Publication' },
  topic: { de: 'Thema', en: 'Topic', fr: 'Thème' },
  all: { de: 'Alle', en: 'All', fr: 'Tous' },
  from: { de: 'Von', en: 'From', fr: 'Du' },
  until: { de: 'Bis', en: 'Until', fr: 'Au' },
  filter: { de: 'Filtern', en: 'Filter', fr: 'Filtrer' },
  searchPerson: { de: 'Name', en: 'Name', fr: 'Nom' },
  shift: { de: 'Schicht', en: 'Shift', fr: 'Service' },
  sentBy: { de: 'beauftragt von', en: 'assigned by', fr: 'mandaté par' },
  empty: { de: 'Keine Einträge', en: 'No entries', fr: 'Aucune entrée' },
  deletedText: { de: 'Gelöschter Text', en: 'Deleted text', fr: 'Texte supprimé' },
  more: {
    de: 'Es werden die neusten {n} Einträge gezeigt. Grenze die Filter ein.',
    en: 'The newest {n} entries are shown. Narrow the filters.',
    fr: 'Les {n} entrées les plus récentes sont affichées. Affine les filtres.',
  },
} satisfies Record<string, StaticTranslationString>;

const CAPACITIES: ForumActorCapacity[] = ['TOPIC_ADMIN', 'PIKET', 'DELEGATE'];

const dateTime = (date: Date, locale: Locale): string =>
  date.toLocaleString(locale === 'de' ? 'de-CH' : locale, {
    timeZone: 'Europe/Zurich',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const statusName = (value: unknown, locale: Locale): string => {
  const status = FORUM_POST_STATUSES.find((candidate) => candidate === value);
  return status === undefined ? textOf(value) : forumStatusLabel[status][locale];
};

/** What changed, in a line: the status from and to, the post it was merged into, and so on. */
const describeChange = (
  event: { action: ForumAuditAction; before: unknown; after: unknown },
  locale: Locale,
): string => {
  const before = recordOf(event.before);
  const after = recordOf(event.after);
  switch (event.action) {
    case 'STATUS_CHANGED': {
      return `${statusName(before['status'], locale)} → ${statusName(after['status'], locale)}`;
    }
    case 'MERGED': {
      return `→ «${textOf(after['intoTitle'])}»`;
    }
    case 'ASSIGNED': {
      return `→ ${textOf(after['assigneeName'])}`;
    }
    case 'ASSIGNMENT_ENDED': {
      return textOf(before['assigneeName']);
    }
    default: {
      return '';
    }
  }
};

const parseDate = (value: string | undefined, endOfDay: boolean): Date | undefined => {
  if (value === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59' : '00:00:00'}+02:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Admin view at `/admin/forum-protocol`: the forum's protocol, newest first, filtered by topic,
 * person, capacity, action and time. Read only; the table refuses every write but an insert.
 * For the same people who manage the forum topics, `hasAdminOrWebAccess`.
 */
export default async function ForumProtocolView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps): Promise<React.ReactElement> {
  const { req, permissions, visibleEntities, locale: adminLocale } = initPageResult;
  const { payload, i18n, user } = req;
  const adminRoute = payload.config.routes.admin;
  if (!user || !hasAdminOrWebAccess({ req })) redirect(adminRoute);
  const locale: Locale = getAdminLocale(i18n);

  const parameter = (name: string): string | undefined => {
    const value = searchParams?.[name];
    return typeof value === 'string' && value !== '' ? value : undefined;
  };
  const topic = parameter('topic');
  const capacity = CAPACITIES.find((value) => value === parameter('capacity'));
  const action = (Object.keys(actionLabel) as ForumAuditAction[]).find(
    (value) => value === parameter('action'),
  );
  const person = parameter('person');
  const from = parseDate(parameter('from'), false);
  const until = parseDate(parameter('until'), true);

  const where: Prisma.ForumAuditEventWhereInput = {
    ...(topic === undefined ? {} : { chatId: topic }),
    ...(capacity === undefined ? {} : { capacity }),
    ...(action === undefined ? {} : { action }),
    ...(person === undefined
      ? {}
      : {
          OR: [
            { actorName: { contains: person, mode: 'insensitive' } },
            { delegatedByName: { contains: person, mode: 'insensitive' } },
          ],
        }),
    ...(from === undefined && until === undefined
      ? {}
      : {
          createdAt: {
            ...(from === undefined ? {} : { gte: from }),
            ...(until === undefined ? {} : { lte: until }),
          },
        }),
  };

  const [events, topics] = await Promise.all([
    prisma.forumAuditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE + 1,
    }),
    prisma.chat.findMany({
      where: { type: 'FORUM' },
      select: { uuid: true, name: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const shown = events.slice(0, PAGE_SIZE);

  const selectClassName =
    'h-10 rounded-(--style-radius-s) border border-(--theme-elevation-150) bg-(--theme-input-bg) px-2 text-(--theme-text)';

  return (
    <DefaultTemplate
      i18n={i18n}
      {...(adminLocale === undefined ? {} : { locale: adminLocale })}
      {...(params === undefined ? {} : { params })}
      payload={payload}
      permissions={permissions}
      {...(searchParams === undefined ? {} : { searchParams })}
      user={user}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: title[locale] }]} />
      <Gutter className="flex flex-col gap-6 pt-8 pb-16">
        <div>
          <h1 className="mb-1 text-3xl font-bold">{title[locale]}</h1>
          <p className="max-w-3xl text-(--theme-elevation-500)">{intro[locale]}</p>
        </div>

        {/* a plain GET form: the filters are the address, so a filtered view can be shared */}
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {labels.topic[locale]}
            <select name="topic" defaultValue={topic ?? ''} className={selectClassName}>
              <option value="">{labels.all[locale]}</option>
              {topics.map((candidate) => (
                <option key={candidate.uuid} value={candidate.uuid}>
                  {candidate.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {labels.capacity[locale]}
            <select name="capacity" defaultValue={capacity ?? ''} className={selectClassName}>
              <option value="">{labels.all[locale]}</option>
              {CAPACITIES.map((value) => (
                <option key={value} value={value}>
                  {forumCapacityLabel[value][locale]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {labels.action[locale]}
            <select name="action" defaultValue={action ?? ''} className={selectClassName}>
              <option value="">{labels.all[locale]}</option>
              {(Object.keys(actionLabel) as ForumAuditAction[]).map((value) => (
                <option key={value} value={value}>
                  {actionLabel[value][locale]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {labels.searchPerson[locale]}
            <input
              name="person"
              defaultValue={person ?? ''}
              className={selectClassName}
              placeholder="Lea v/o Funke"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {labels.from[locale]}
            <input
              type="date"
              name="from"
              defaultValue={parameter('from') ?? ''}
              className={selectClassName}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {labels.until[locale]}
            <input
              type="date"
              name="until"
              defaultValue={parameter('until') ?? ''}
              className={selectClassName}
            />
          </label>
          <button
            type="submit"
            className="h-10 cursor-pointer rounded-(--style-radius-s) bg-(--theme-elevation-800) px-4 text-(--theme-elevation-0)"
          >
            {labels.filter[locale]}
          </button>
        </form>

        {shown.length === 0 ? (
          <p className="text-(--theme-elevation-500)">{labels.empty[locale]}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-(--theme-elevation-150) text-left">
                  <th className="p-2 font-semibold">{labels.time[locale]}</th>
                  <th className="p-2 font-semibold">{labels.person[locale]}</th>
                  <th className="p-2 font-semibold">{labels.capacity[locale]}</th>
                  <th className="p-2 font-semibold">{labels.action[locale]}</th>
                  <th className="p-2 font-semibold">{labels.post[locale]}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((event) => {
                  const deletedText =
                    event.action === 'DELETED' &&
                    typeof event.before === 'object' &&
                    event.before !== null
                      ? (event.before as { text?: unknown }).text
                      : undefined;
                  return (
                    <tr
                      key={event.id}
                      className="border-b border-(--theme-elevation-100) align-top"
                    >
                      <td className="p-2 whitespace-nowrap tabular-nums">
                        {dateTime(event.createdAt, locale)}
                      </td>
                      <td className="p-2">
                        {event.actorName}
                        {event.shiftStart !== null && event.shiftEnd !== null && (
                          <div className="text-xs text-(--theme-elevation-500)">
                            {labels.shift[locale]} {dateTime(event.shiftStart, locale)} –{' '}
                            {dateTime(event.shiftEnd, locale)}
                          </div>
                        )}
                        {event.delegatedByName !== null && (
                          <div className="text-xs text-(--theme-elevation-500)">
                            {labels.sentBy[locale]} {event.delegatedByName}
                          </div>
                        )}
                      </td>
                      <td className="p-2 whitespace-nowrap">
                        {forumCapacityLabel[event.capacity][locale]}
                      </td>
                      <td className="p-2">
                        <span className="font-semibold">{actionLabel[event.action][locale]}</span>{' '}
                        {describeChange(event, locale)}
                        {event.note !== null && (
                          <div className="text-xs text-(--theme-elevation-500)">«{event.note}»</div>
                        )}
                        {typeof deletedText === 'string' && deletedText !== '' && (
                          <div className="text-xs text-(--theme-elevation-500)">
                            {labels.deletedText[locale]}: «{deletedText}»
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <a href={`/app/forum/${event.messageId}`} target="_blank" rel="noreferrer">
                          {event.postTitle}
                        </a>
                        <div className="text-xs text-(--theme-elevation-500)">
                          {event.topicName}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {events.length > PAGE_SIZE && (
              <p className="mt-3 text-sm text-(--theme-elevation-500)">
                {labels.more[locale].replace('{n}', String(PAGE_SIZE))}
              </p>
            )}
          </div>
        )}
      </Gutter>
    </DefaultTemplate>
  );
}
