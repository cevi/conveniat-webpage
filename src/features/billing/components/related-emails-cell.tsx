import configPromise from '@payload-config';
import { getPayload } from 'payload';
import React from 'react';

// Define the shape of the row data
interface RowData {
  id: string;
}

export const RelatedEmailsCell: React.FC<{
  rowData: RowData;
}> = async ({ rowData }) => {
  const payload = await getPayload({ config: configPromise });

  // Fetch the count of outgoing emails for this participant
  const relatedEmails = await payload.find({
    collection: 'outgoing-emails',
    where: {
      billParticipant: { equals: rowData.id },
    },
    limit: 1, // We only need the totalDocs count
    context: { internal: true },
  });

  const count = relatedEmails.totalDocs;

  if (count === 0) {
    return <span className="text-gray-400">Keine E-Mails</span>;
  }

  const label = count === 1 ? '1 Email' : `${String(count)} Emails`;

  // Construct the URL to the outgoing-emails collection filtered by this participant
  // The filter uses standard Payload CMS URL structure for `where` queries
  const href = `/admin/collections/outgoing-emails?where[or][0][and][0][billParticipant][equals]=${encodeURIComponent(rowData.id)}`;

  return (
    <a
      href={href}
      className="text-gray-900 underline hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300"
      title="Alle zugehörigen E-Mails anzeigen"
    >
      {label}
    </a>
  );
};

export default RelatedEmailsCell;
