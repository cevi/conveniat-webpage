'use client';

import {
  buildHitobitoParticipationUrl,
  HitobitoLink,
} from '@/features/billing/components/hitobito-link-cell';
import { useFormFields } from '@payloadcms/ui';
import type React from 'react';

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

/** The Cevi.DB link of the list column, in the sidebar of the edit view. */
export const HitobitoLinkField: React.FC = () => {
  const groupId = useFormFields(([fields]) => readString(fields['groupId']?.value));
  const eventId = useFormFields(([fields]) => readString(fields['eventId']?.value));
  const participationUuid = useFormFields(([fields]) =>
    readString(fields['participationUuid']?.value),
  );

  const url = buildHitobitoParticipationUrl({ groupId, eventId, participationUuid });
  if (url === undefined) return <></>;

  return (
    <div className="mb-8">
      <HitobitoLink url={url} />
    </div>
  );
};

export default HitobitoLinkField;
