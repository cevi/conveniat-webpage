import type { HofDashboardDocument } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { formatFileSize, translate } from '@/features/hof-dashboard/components/texts';
import type { Locale } from '@/types/types';
import { Download, FileText } from 'lucide-react';
import type React from 'react';

/** Documents to download, each as one row that is a link as a whole. */
export const DocumentLinks: React.FC<{ documents: HofDashboardDocument[]; locale: Locale }> = ({
  documents,
  locale,
}) => (
  <ul className="divide-y divide-gray-100">
    {documents.map((document) => (
      <li key={document.id}>
        <a
          href={document.url}
          target="_blank"
          rel="noreferrer"
          className="group flex min-h-11 items-center justify-between gap-4 py-3"
        >
          <span className="flex min-w-0 items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" aria-hidden />
            <span className="min-w-0">
              <span className="block font-semibold break-words text-gray-900 group-hover:underline">
                {document.title}
              </span>
              {document.filesize !== undefined && (
                <span className="text-xs text-gray-500">
                  {formatFileSize(document.filesize, locale)}
                </span>
              )}
            </span>
          </span>
          <span className="text-conveniat-green flex shrink-0 items-center gap-1.5 text-sm font-semibold">
            <Download className="h-4 w-4" aria-hidden />
            {translate('download', locale)}
          </span>
        </a>
      </li>
    ))}
  </ul>
);
