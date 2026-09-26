import type { HofDashboardFile } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { HOF_FILE_KIND_LABELS } from '@/features/hof-dashboard/constants';
import { formatDate, translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { FileText } from 'lucide-react';
import type React from 'react';

/**
 * Files of a submission, newest first as they come. The newest of each kind stands out; the
 * versions it replaced stay listed below it. With `status`, the newest of each kind carries
 * the Ressort's status and the others read as replaced.
 */
export const FileList: React.FC<{
  files: HofDashboardFile[];
  locale: Locale;
  showKind?: boolean;
  status?: { newest: string | undefined; replaced: string };
}> = ({ files, locale, showKind = false, status }) => (
  <ul className="min-w-0 space-y-2">
    {files.map((file) => {
      const newest = files.find((candidate) => candidate.kind === file.kind) === file;
      const details = [
        showKind ? HOF_FILE_KIND_LABELS[file.kind][locale] : undefined,
        translate('version', locale, { n: file.version }),
        translate('uploadedOn', locale, { date: formatDate(file.uploadedAt, locale) }),
      ].filter((part) => part !== undefined);
      const name = cn('break-all', newest ? 'text-conveniat-green font-semibold' : 'text-gray-600');
      return (
        <li key={file.id} className="flex items-start justify-between gap-4 text-sm">
          <div className="flex min-w-0 items-start gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
            <div className="min-w-0">
              {file.url === undefined ? (
                <span className={name}>{file.filename}</span>
              ) : (
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(name, 'hover:underline')}
                >
                  {file.filename}
                </a>
              )}
              <p className="text-xs text-gray-500">{details.join(' · ')}</p>
            </div>
          </div>
          {status !== undefined && (
            <span className="shrink-0 text-xs font-semibold text-gray-600">
              {newest ? status.newest : status.replaced}
            </span>
          )}
        </li>
      );
    })}
  </ul>
);
