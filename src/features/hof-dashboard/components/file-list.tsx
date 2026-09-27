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
  const content = (
    <>
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" aria-hidden />
      <span className="min-w-0">
        <span
          className={cn(
            'block break-all group-hover:underline',
            current ? 'text-conveniat-green font-semibold' : 'text-gray-600',
          )}
        >
          {file.filename}
        </span>
        <span className="block text-xs text-gray-500">{details.join(' · ')}</span>
      </span>
    </>
  );
  return (
    <li className="min-w-0 text-sm">
      {file.url === undefined ? (
        <div className="flex items-start gap-2 py-1">{content}</div>
      ) : (
        // the whole row opens the file, so a thumb finds it without aiming for the name
        <a
          href={file.url}
          target="_blank"
          rel="noreferrer"
          className="group -mx-2 flex items-start gap-2 rounded-md px-2 py-1 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-green-600"
        >
          {content}
        </a>
      )}
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
      <ul className="space-y-1">
        {current.map((file) => (
          <FileRow key={file.id} file={file} current showKind={showKind} locale={locale} />
        ))}
      </ul>
      {earlier.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer py-3 font-semibold text-gray-600 hover:text-gray-900">
            {translate('earlierVersions', locale, { n: earlier.length })}
          </summary>
          <ul className="space-y-1 pb-1">
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
