import { ScheduleEntryForm } from '@/components/schedule-entry';
import { Button } from '@/components/ui/buttons/button';
import { LinkComponent } from '@/components/ui/link-component';
import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { SubheadingH3 } from '@/components/ui/typography/subheading-h3';
import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { canUserAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import type {
  CampMapAnnotation,
  CampScheduleEntry,
  User,
} from '@/features/payload-cms/payload-types';
import type { HitobitoNextAuthUser } from '@/types/hitobito-next-auth-user';
import { auth } from '@/utils/auth-helpers';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import { Calendar, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { getPayload } from 'payload';
import type React from 'react';

// Enhanced helper to format date and time more elegantly
const formatDateTime = (
  date: string,
  time: string,
): {
  formattedDate: string;
  time: string;
} => {
  const dateObject = new Date(date);
  const formattedDate = dateObject.toLocaleDateString('de-CH', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return { formattedDate, time };
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
  const location = entry.location as CampMapAnnotation;
  const organiser = entry.organiser ? (entry.organiser as User) : undefined;

  const isUserOrganiser = user?.uuid === organiser?.id;

  const userCanEdit = isUserOrganiser || canUserAccessAdminPanel({ user });

  return (
    <article className="my-8 w-full max-w-2xl px-8 max-xl:mx-auto">
      <HeadlineH1>Programm-Punkt: {entry.title}</HeadlineH1>
      <div className="min-w-0 flex-1">
        {/* Location and Time Display - single line */}
        <div className="mb-3 flex flex-wrap items-center gap-4">
          {/* Location - inline */}
          {location.title !== '' && (
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
              <Link
                href={`/app/map?locationId=${location.id}`}
                className="cursor-pointer font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
              >
                {location.title}
              </Link>
            </div>
          )}

          {/* Time slots */}

          <div className={'flex flex-shrink-0 items-center gap-3 text-sm'}>
            {
              <div className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-blue-700">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="font-medium whitespace-nowrap">
                  {formatDateTime(entry.timeslot.date, entry.timeslot.time).formattedDate}
                </span>
              </div>
            }

            {/* Time Slots */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-500" />
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-gray-700">
                  {entry.timeslot.time}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
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
      </div>
    </article>
  );
};

export default ScheduleDetailPage;
