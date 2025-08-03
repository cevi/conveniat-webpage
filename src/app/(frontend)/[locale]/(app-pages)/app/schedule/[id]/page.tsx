import { ScheduleEntryForm } from '@/components/schedule-entry';
import { Button } from '@/components/ui/buttons/button';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { SubheadingH3 } from '@/components/ui/typography/subheading-h3';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { CampScheduleEntry, User } from '@/features/payload-cms/payload-types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import Link from 'next/link';
import { getPayload } from 'payload';
import type React from 'react';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] ?? '';
};

const createChatWithOrganiser = (organiser: User): string => {
  return `/app/chat/new-chat-with-user/${organiser.id}`;
};

const ScheduleDetailPage: React.FC<{
  params: Promise<{
    id: string;
  }>;
}> = async ({ params }) => {
  const { id: scheduleId } = await params;
  const payload = await getPayload({ config });

  // the user object is undefined if the user is not logged in
  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser | undefined;

  const locale = await getLocaleFromCookies();

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    depth: 1,
    locale: locale,
    where: {
      id: { equals: scheduleId },
    },
    limit: 1,
  });

  if (scheduleEntries.docs.length === 0) {
    return (
      <>
        <HeadlineH1>Fehler.</HeadlineH1>
        <p>Der Programm-Punkt wurde nicht gefunden.</p>
      </>
    );
  }

  const entry = scheduleEntries.docs[0] as CampScheduleEntry;

  const organiser = entry.organiser ? (entry.organiser as User) : undefined;

  const isUserOrganiser = user?.uuid === organiser?.id;

  const userCanEdit = isUserOrganiser || canUserAccessAdminPanel({ user });

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <HeadlineH1>Programm-Punkt: {entry.title}</HeadlineH1>
      {userCanEdit && <ScheduleEntryForm description={entry.description} locale={locale} />}
      <div>
        <LexicalRichTextSection richTextSection={entry.description} />
        {organiser && (
          <div className="my-8">
            <SubheadingH3>Kontakt mit Organisier</SubheadingH3>
            <Button className="bg-conveniat-green hover:bg-conveniat-green-dark text-white">
              <Link href={createChatWithOrganiser(organiser)}>
                Chat mit {organiser.fullName} starten
              </Link>
            </Button>
            <p className="mt-2 text-gray-400">
              Mailadresse:{' '}
              <LinkComponent className="font-bold" href={`mailto:${organiser.email}`}>
                {organiser.email}
              </LinkComponent>
            </p>
          </div>
        )}
        <p>
          {formatDate(new Date(entry.timeslot.date))}: <span>{entry.timeslot.time}</span>
        </p>
      </div>
    </article>
  );
};

export default ScheduleDetailPage;
