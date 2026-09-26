import type { HofDashboardFile } from '@/features/hof-dashboard/api/hof-dashboard-data';
import { HOF_FILE_KIND_LABELS } from '@/features/hof-dashboard/constants';
import { formatDate, translate } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { FileText } from 'lucide-react';
import type React from 'react';

const FileRow: React.FC<{
  file: HofDashboardFile;
  current: boolean;
  showKind: boolean;
  locale: Locale;
}> = ({ file, current, showKind, locale }) => {
  const details = [
    showKind ? HOF_FILE_KIND_LABELS[file.kind][locale] : undefined,
    translate('version', locale, { n: file.version }),
    translate('uploadedOn', locale, { date: formatDate(file.uploadedAt, locale) }),
  ].filter((part) => part !== undefined);
  const name = cn('break-all', current ? 'text-conveniat-green font-semibold' : 'text-gray-600');
  return (
    <li className="flex min-w-0 items-start gap-2 text-sm">
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
    </li>
  );
};

/**
 * The files of a submission as they come, newest first: the newest of each kind in view, the
 * versions they replaced folded away below, so a long history does not push the rest of the
 * card off the screen.
 */
export const FileList: React.FC<{
  files: HofDashboardFile[];
  locale: Locale;
  showKind?: boolean;
}> = ({ files, locale, showKind = false }) => {
  const current = files.filter(
    (file) => files.find((candidate) => candidate.kind === file.kind) === file,
  );
  const earlier = files.filter((file) => !current.includes(file));
  return (
    <div className="min-w-0 space-y-2">
      <ul className="space-y-2">
        {current.map((file) => (
          <FileRow key={file.id} file={file} current showKind={showKind} locale={locale} />
        ))}
      </ul>
      {earlier.length > 0 && (
        <details className="text-sm">
          <summary className="min-h-9 cursor-pointer py-2 font-semibold text-gray-600 hover:text-gray-900">
            {translate('earlierVersions', locale, { n: earlier.length })}
          </summary>
          <ul className="space-y-2 pb-1">
            {earlier.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                current={false}
                showKind={showKind}
                locale={locale}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
