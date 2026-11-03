import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import prisma from '@/lib/db/prisma';
import { ChatMembershipPermission } from '@/lib/prisma/client';
import type { StaticTranslationString } from '@/types/types';
import { FieldLabel, Pill } from '@payloadcms/ui';
import type { UIFieldServerProps } from 'payload';
import type React from 'react';

/** Enough to check a channel by eye; the count above the list covers the rest. */
const MAX_LISTED = 500;

const notCreatedYet: StaticTranslationString = {
  de: 'Der Kanal wird beim Speichern erstellt; danach stehen hier seine Mitglieder.',
  en: 'The channel is created when you save; its members are listed here afterwards.',
  fr: 'Le canal est créé à l’enregistrement ; ses membres sont ensuite listés ici.',
};
const countLabel = (count: number): StaticTranslationString => ({
  de: `${String(count)} ${count === 1 ? 'Person' : 'Personen'}`,
  en: `${String(count)} ${count === 1 ? 'person' : 'people'}`,
  fr: `${String(count)} ${count === 1 ? 'personne' : 'personnes'}`,
});
const moreLabel = (count: number): StaticTranslationString => ({
  de: `… und ${String(count)} weitere`,
  en: `… and ${String(count)} more`,
  fr: `… et ${String(count)} autres`,
});
const explanation: StaticTranslationString = {
  de: 'Wer zur Zielgruppe gehört und sich noch nie in der App angemeldet hat, fehlt hier und kommt bei der ersten Anmeldung dazu.',
  en: 'People who belong to the audience but have never logged in to the app are missing here and are added on their first login.',
  fr: 'Les personnes du public cible qui ne se sont jamais connectées à l’app n’apparaissent pas ici et sont ajoutées à leur première connexion.',
};
const permissionLabels: Partial<Record<ChatMembershipPermission, StaticTranslationString>> = {
  [ChatMembershipPermission.OWNER]: { de: 'Besitzer/-in', en: 'Owner', fr: 'Propriétaire' },
  [ChatMembershipPermission.ADMIN]: { de: 'Admin', en: 'Admin', fr: 'Admin' },
};

/**
 * Lists who is in a channel's chat right now, as the app sees it: the memberships in
 * the chat database, not the audience the channel is set to.
 */
export const ChannelMembersField = async ({
  data,
  i18n,
}: UIFieldServerProps): Promise<React.ReactElement> => {
  const locale = getAdminLocale(i18n);
  const chatUuid: unknown = (data as Record<string, unknown> | undefined)?.['chatUuid'];

  if (typeof chatUuid !== 'string' || chatUuid === '') {
    return (
      <div className="field-type mb-8">
        <p className="m-0 text-(--theme-elevation-500)">{notCreatedYet[locale]}</p>
      </div>
    );
  }

  // owners and admins first: Postgres sorts an enum in the order it declares it
  const [total, listed] = await Promise.all([
    prisma.chatMembership.count({ where: { chatId: chatUuid } }),
    prisma.chatMembership.findMany({
      where: { chatId: chatUuid },
      select: { userId: true, chatPermission: true, user: { select: { name: true } } },
      orderBy: [{ chatPermission: 'asc' }, { user: { name: 'asc' } }],
      take: MAX_LISTED,
    }),
  ]);

  return (
    <div className="field-type mb-8">
      <FieldLabel label={countLabel(total)[locale]} />
      <ul className="m-0 flex max-h-96 list-none flex-col overflow-y-auto border-y border-(--theme-elevation-100) p-0">
        {listed.map((member) => {
          const permission = permissionLabels[member.chatPermission];
          return (
            <li
              key={member.userId}
              className="flex items-center justify-between gap-2 border-b border-(--theme-elevation-100) py-1.5 last:border-b-0"
            >
              <span>{member.user.name}</span>
              {permission !== undefined && (
                <Pill size="small" pillStyle="light">
                  {permission[locale]}
                </Pill>
              )}
            </li>
          );
        })}
      </ul>
      {total > listed.length && (
        <p className="m-0 mt-2 text-(--theme-elevation-500)">
          {moreLabel(total - listed.length)[locale]}
        </p>
      )}
      <p className="m-0 mt-2 text-sm text-(--theme-elevation-500)">{explanation[locale]}</p>
    </div>
  );
};
