import { Card } from '@/components/ui/card';
import type { HofDashboardDocument } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { DocumentDownloadRow } from '@/features/payload-cms/components/content-blocks/file-download';
import { withLocaleParameter } from '@/features/payload-cms/payload-cms/utils/document-download-name';
import type { Locale } from '@/types/types';
import type React from 'react';

/** Documents to download, as rows of a card the way the website's file download block shows them. */
export const DocumentLinks: React.FC<{ documents: HofDashboardDocument[]; locale: Locale }> = ({
  documents,
  locale,
}) => (
  <Card as="ul" divided>
    {documents.map((document) => (
      <DocumentDownloadRow
        key={document.id}
        // the download is named after the title in the reader's language
        href={withLocaleParameter(document.url, locale)}
        // already the file name where the document has no title
        displayName={document.title}
        filename={document.filename ?? ''}
        mimeType={document.mimeType ?? ''}
        thumbnailUrl={document.pdfThumbnailUrl}
        filesize={document.filesize}
        updatedAt={document.updatedAt}
        openInNewTab
        locale={locale}
      />
    ))}
  </Card>
);
