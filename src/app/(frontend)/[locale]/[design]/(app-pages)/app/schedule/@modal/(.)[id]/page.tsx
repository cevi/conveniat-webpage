import type { CampScheduleEntry } from '@/features/payload-cms/payload-types';
import { DetailStarButton } from '@/features/schedule/components/detail-star-button';
import { ScheduleDetailContent } from '@/features/schedule/components/schedule-detail-content';
import { ScheduleModalWrapper } from '@/features/schedule/components/schedule-modal-wrapper';
import { auth } from '@/utils/auth';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import config from '@payload-config';
import { getPayload } from 'payload';
import type React from 'react';

/**
 * Intercepting route for schedule details.
 * Shows the details in a modal overlay while keeping the schedule list visible.
 */
const ScheduleDetailModal: React.FC<{
  params: Promise<{
    id: string;
  }>;
}> = async ({ params }) => {
  const { id: scheduleId } = await params;
  const payload = await getPayload({ config });

  await auth();
  const locale = await getLocaleFromCookies();

  const scheduleEntries = await payload.find({
    collection: 'camp-schedule-entry',
    depth: 1,
    locale: locale,
    where: { id: { equals: scheduleId } },
    limit: 1,
    fallbackLocale: 'de',
  });

  if (scheduleEntries.docs.length === 0) {
    return (
      <ScheduleModalWrapper title="Not Found">
        <div className="flex h-64 items-center justify-center text-gray-500">Entry not found.</div>
      </ScheduleModalWrapper>
    );
  }

  const entry = scheduleEntries.docs[0] as CampScheduleEntry;

  return (
    <ScheduleModalWrapper title={entry.title} rightAction={<DetailStarButton entryId={entry.id} />}>
      <ScheduleDetailContent entry={entry} locale={locale} />
    </ScheduleModalWrapper>
  );
};

export default ScheduleDetailModal;
