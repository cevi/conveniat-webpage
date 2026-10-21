'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

interface RowData {
  id: string;
  groupId?: string;
  eventId?: string;
  participationUuid?: string;
}

const isMissing = (part: string | undefined): part is '' | undefined =>
  part === undefined || part === '';

/**
 * The participation page in the Cevi.DB, or undefined while any part of it is missing:
 * `{{NEXT_PUBLIC_HITOBITO_API_URL}}/groups/{{Gruppen-ID}}/events/{{Anlass-ID}}/participations/{{participant id}}`
 */
export const buildHitobitoParticipationUrl = ({
  groupId,
  eventId,
  participationUuid,
}: {
  [Key in 'groupId' | 'eventId' | 'participationUuid']?: string | undefined;
}): string | undefined => {
  // eslint-disable-next-line n/no-process-env
  const hitobitoApiUrl = process.env['NEXT_PUBLIC_HITOBITO_API_URL'];
  if (
    isMissing(groupId) ||
    isMissing(eventId) ||
    isMissing(participationUuid) ||
    isMissing(hitobitoApiUrl)
  ) {
    return undefined;
  }
  return `${hitobitoApiUrl}/groups/${encodeURIComponent(groupId)}/events/${encodeURIComponent(eventId)}/participations/${encodeURIComponent(participationUuid)}`;
};

/** A link to the participation in the Cevi.DB. */
export const HitobitoLink: React.FC<{ url: string | undefined }> = ({ url }) => {
  if (url === undefined) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 hover:underline"
      title="In Cevi.DB öffnen"
    >
      <ExternalLink className="h-4 w-4" />
      <span>Cevi.DB</span>
    </a>
  );
};

/**
 * Custom Payload CMS Cell component that renders a link to the Hitobito participation page.
 */
export const HitobitoLinkCell: React.FC<{
  rowData?: RowData;
}> = ({ rowData }) => (
  // Payload also renders a `ui` field's Cell while building the edit view's form state,
  // without a row.
  <HitobitoLink url={rowData === undefined ? undefined : buildHitobitoParticipationUrl(rowData)} />
);

export default HitobitoLinkCell;
