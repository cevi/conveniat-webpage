import { ScheduleEntryForm } from '@/components/scheduleEntry';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type { CampScheduleEntry, User } from '@/features/payload-cms/payload-types';
import { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import { getPayload } from 'payload';
import type React from 'react';

const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0] ?? '';
};

const ScheduleDetailPage: React.FC<{
  params: Promise<{
    id: string;
  }>;
}> = async ({ params }) => {
  const { id: scheduleId } = await params;
  const payload = await getPayload({ config });

  const session = await auth();
  const user = session?.user as HitobitoNextAuthUser;

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
          <p>
            Schreibe eine Mail an{' '}
            <LinkComponent className="font-bold text-red-600" href={`mailto:${organiser.email}`}>
              {organiser.fullName}
            </LinkComponent>
            .
          </p>
        )}
        {entry.timeslots.map((timeslot) => (
          <p key={timeslot.id}>
            {formatDate(new Date(timeslot.date))}: <span>{timeslot.time}</span>
          </p>
        ))}
      </div>
    </article>
  );
};

export default ScheduleDetailPage;
