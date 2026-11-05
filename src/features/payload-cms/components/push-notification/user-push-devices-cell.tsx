import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import { isPushDeviceStale } from '@/lib/push/push-device-staleness';
import type { StaticTranslationString } from '@/types/types';
import { Pill } from '@payloadcms/ui';
import { headers } from 'next/headers';
import type { DefaultServerCellComponentProps, Payload } from 'payload';
import type React from 'react';
import { cache } from 'react';

const webLabel: StaticTranslationString = { de: 'Web', fr: 'Web', en: 'Web' };
const appLabel: StaticTranslationString = { de: 'App', fr: 'App', en: 'App' };
const inactiveLabel: StaticTranslationString = { de: 'inaktiv', fr: 'inactif', en: 'inactive' };

/** Who is looking at the list, read once per request rather than once per row. */
const viewerOf = cache(async (payload: Payload) => {
  const { user } = await payload.auth({ headers: await headers() });
  return user;
});

/**
 * The list column of a person's push devices. Payload renders a cell only for a column that is
 * shown, and the column is not among the defaults, so the query per row runs only for an admin
 * who turned it on. The read goes through the viewer's own access, so the collection's rule
 * decides who sees the devices, and everybody else gets an empty cell.
 */
const UserPushDevicesCell = async ({
  payload,
  rowData,
  i18n,
}: DefaultServerCellComponentProps): Promise<React.JSX.Element> => {
  const locale = getAdminLocale(i18n);
  const viewer = await viewerOf(payload);
  if (viewer === null) return <></>;

  let devices: { platform: string; lastUsedAt?: string | null }[];
  try {
    ({ docs: devices } = await payload.find({
      collection: 'push-notification-subscriptions',
      where: { user: { equals: rowData['id'] } },
      pagination: false,
      depth: 0,
      select: { platform: true, lastUsedAt: true },
      overrideAccess: false,
      user: viewer,
    }));
  } catch {
    // Forbidden: the viewer may read users but not their devices
    return <></>;
  }

  if (devices.length === 0) return <span className="text-(--theme-elevation-400)">–</span>;

  const web = devices.filter((device) => device.platform === 'web').length;
  const app = devices.length - web;
  const inactive = devices.filter((device) => isPushDeviceStale(device.lastUsedAt)).length;

  return (
    <span className="flex flex-wrap gap-1">
      {web > 0 && <Pill size="small">{`${String(web)} ${webLabel[locale]}`}</Pill>}
      {app > 0 && <Pill size="small">{`${String(app)} ${appLabel[locale]}`}</Pill>}
      {inactive > 0 && (
        <Pill
          pillStyle="warning"
          size="small"
        >{`${String(inactive)} ${inactiveLabel[locale]}`}</Pill>
      )}
    </span>
  );
};

export default UserPushDevicesCell;
