'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

interface RowData {
  id: string;
  groupId?: string;
  eventId?: string;
  participationUuid?: string;
}

/**
 * Custom Payload CMS Cell component that renders a link to the Hitobito participation page.
 */
export const HitobitoLinkCell: React.FC<{
  rowData: RowData;
}> = ({ rowData }) => {
  const hitobitoApiUrl = process.env['NEXT_PUBLIC_HITOBITO_API_URL'];
  const { groupId, eventId, participationUuid } = rowData;

  if (!groupId || !eventId || !participationUuid || !hitobitoApiUrl) {
    return <span className="text-gray-400">-</span>;
  }

  // Construct Hitobito link: {{NEXT_PUBLIC_HITOBITO_API_URL}}/groups/{{Gruppen-ID}}/events/{{Anlass-ID}}/participations/{{participant id}}
  const hitobitoUrl = `${hitobitoApiUrl}/groups/${encodeURIComponent(groupId)}/events/${encodeURIComponent(eventId)}/participations/${encodeURIComponent(participationUuid)}`;

  return (
    <a
      href={hitobitoUrl}
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

export default HitobitoLinkCell;
