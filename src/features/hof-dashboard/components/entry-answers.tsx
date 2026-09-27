import type {
  HofDashboardAnswer,
  HofDashboardFile,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import { formatFileSize, formatNumber } from '@/features/hof-dashboard/texts';
import type { Locale } from '@/types/types';
import { FileText } from 'lucide-react';
import type React from 'react';

/** The ending of a file name in capitals, "PDF", as a short type next to its size. */
const fileType = (name: string): string | undefined => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : undefined;
};

/**
 * A file handed in, as the form's upload lists it: name, type and size, the row opening it.
 */
export const FileRow: React.FC<{ file: HofDashboardFile; locale: Locale }> = ({ file, locale }) => {
  const details = [
    fileType(file.name),
    file.size === undefined ? undefined : formatFileSize(file.size, locale),
  ].filter((part) => part !== undefined);
  return (
    <li>
      <a
        href={file.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-md border border-gray-100 bg-white p-3 shadow-xs focus-visible:outline-2 focus-visible:outline-green-600"
      >
        <FileText className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
        <span className="min-w-0">
          <span className="font-body block truncate text-sm font-medium text-gray-700 underline-offset-2 hover:underline">
            {file.name}
          </span>
          {details.length > 0 && (
            <span className="block text-xs text-gray-400">{details.join(' · ')}</span>
          )}
        </span>
      </a>
    </li>
  );
};

/** Ordered materials by section, with their quantities right-aligned. */
const MaterialTable: React.FC<{
  materials: Extract<HofDashboardAnswer, { kind: 'materials' }>['materials'];
  locale: Locale;
}> = ({ materials, locale }) => {
  const sections: { section: string | undefined; lines: typeof materials }[] = [];
  for (const line of materials) {
    const last = sections.at(-1);
    if (last !== undefined && last.section === line.section) last.lines.push(line);
    else sections.push({ section: line.section, lines: [line] });
  }
  return (
    <div className="space-y-3">
      {sections.map(({ section, lines }, index) => (
        <div key={section ?? `section-${index}`}>
          {section !== undefined && (
            <p className="font-body mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
              {section}
            </p>
          )}
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
            {lines.map((line) => (
              <li key={line.id} className="flex items-baseline justify-between gap-3 px-3 py-2">
                <span className="text-sm text-gray-700">{line.name}</span>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">
                  {formatNumber(line.quantity, locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

/** What a submission answered, in the order its form asks, labelled as in the form. */
export const EntryAnswers: React.FC<{ answers: HofDashboardAnswer[]; locale: Locale }> = ({
  answers,
  locale,
}) => (
  <dl className="space-y-4">
    {answers.map((answer) => (
      <div key={answer.field}>
        <dt className="font-body mb-1 text-sm font-medium text-gray-500">{answer.label}</dt>
        <dd>
          {answer.kind === 'text' && (
            <p className="text-sm whitespace-pre-line text-gray-900">{answer.text}</p>
          )}
          {answer.kind === 'files' && (
            <ul className="space-y-2">
              {answer.files.map((file) => (
                <FileRow key={file.id} file={file} locale={locale} />
              ))}
            </ul>
          )}
          {answer.kind === 'materials' && (
            <MaterialTable materials={answer.materials} locale={locale} />
          )}
        </dd>
      </div>
    ))}
  </dl>
);
