import prisma from '@/lib/db/prisma';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { PayloadRequest } from 'payload';
import type React from 'react';

const heading: StaticTranslationString = {
  de: 'Rechte in der App, nicht aus Rollen',
  en: 'Rights in the app that do not come from roles',
  fr: 'Droits dans l’app qui ne viennent pas des rôles',
};

const explanation: StaticTranslationString = {
  de: 'Im Forum darf jemand Beiträge anderer ändern, weil er Kernteam eines Themas ist, gerade Piket hat oder einen Auftrag für einen Beitrag hat. Jede solche Änderung steht im Forum-Protokoll.',
  en: 'In the forum someone may change other people’s posts because they are core team of a topic, on piket duty right now, or hold an assignment for a post. Every such change is in the forum protocol.',
  fr: 'Dans le forum, quelqu’un peut modifier les publications d’autres personnes parce qu’il fait partie de l’équipe centrale d’un thème, est de piquet en ce moment ou a une mission pour une publication. Chaque modification de ce type figure dans le protocole du forum.',
};

const labels = {
  topicAdmin: {
    de: 'Kernteam von Forum-Themen',
    en: 'Core team of forum topics',
    fr: 'Équipe centrale de thèmes du forum',
  },
  piket: {
    de: 'Forum-Piket im Dienst',
    en: 'Forum piket on duty',
    fr: 'Piquet du forum de service',
  },
  assignments: {
    de: 'Offene Aufträge für Beiträge',
    en: 'Open assignments for posts',
    fr: 'Missions ouvertes pour des publications',
  },
  none: { de: 'keine', en: 'none', fr: 'aucun' },
  until: { de: 'bis', en: 'until', fr: 'jusqu’à' },
} satisfies Record<string, StaticTranslationString>;

/**
 * The forum's rights of one person, beside their roles: the topics they are an admin of, a piket
 * shift for forum chats that runs now, and their open assignments. Read from the same places
 * `resolveForumModerator` reads, so the page shows what the app decides.
 */
export const AccessOverviewAppRights: React.FC<{
  personId: string;
  locale: Locale;
  req: PayloadRequest;
}> = async ({ personId, locale, req }) => {
  const now = new Date().toISOString();
  const [adminTopics, shifts, assignments] = await Promise.all([
    prisma.chatMembership.findMany({
      where: {
        userId: personId,
        chatPermission: { in: ['OWNER', 'ADMIN'] },
        chat: { type: 'FORUM' },
      },
      select: { chat: { select: { name: true } } },
    }),
    req.payload.find({
      collection: 'piket-schedules' as never,
      where: {
        and: [
          { startTime: { less_than_equal: now } },
          { endTime: { greater_than_equal: now } },
          { chatTypes: { contains: 'FORUM' } },
          { users: { contains: personId } },
        ],
      },
      depth: 0,
      limit: 5,
      req,
    }) as unknown as Promise<{ docs: { endTime: string }[] }>,
    prisma.forumPostAssignment.findMany({
      where: { assigneeId: personId, endedAt: null },
      select: { post: { select: { title: true } } },
    }),
  ]);

  const until = shifts.docs
    .map((shift) => new Date(shift.endTime))
    .toSorted((a, b) => b.getTime() - a.getTime())[0];

  const rows: [string, string][] = [
    [
      labels.topicAdmin[locale],
      adminTopics.length === 0
        ? labels.none[locale]
        : adminTopics.map((membership) => membership.chat.name).join(', '),
    ],
    [
      labels.piket[locale],
      until === undefined
        ? labels.none[locale]
        : `${labels.until[locale]} ${until.toLocaleString('de-CH', { timeZone: 'Europe/Zurich' })}`,
    ],
    [
      labels.assignments[locale],
      assignments.length === 0
        ? labels.none[locale]
        : assignments.map((assignment) => `«${assignment.post.title}»`).join(', '),
    ],
  ];

  return (
    <section className="mt-6 mb-3 max-w-3xl">
      <h2 className="mb-1 text-lg font-semibold">{heading[locale]}</h2>
      <p className="mb-3 text-sm opacity-70">{explanation[locale]}</p>
      <dl className="flex flex-col">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 border-t border-(--theme-elevation-100) py-1.5 text-sm"
          >
            <dt>{label}</dt>
            <dd className="text-right opacity-80">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
