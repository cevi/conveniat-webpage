import { Card } from '@/components/ui/card';
import { LinkComponent } from '@/components/ui/link-component';
import { SectionLabel } from '@/components/ui/section-label';
import { withLocaleParameter } from '@/features/payload-cms/payload-cms/utils/document-download-name';
import type { Document, FileDownloadBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { Download, FileArchive, FileImage, FileSpreadsheet, FileText } from 'lucide-react';
import type React from 'react';

export type FileDownloadType = FileDownloadBlock & { locale: Locale };

/** A document the visitor may read. Without read access, Payload leaves the bare id. */
type DownloadableFile = Document & { url: string; filename: string };

const isDownloadable = (file: unknown): file is DownloadableFile =>
  typeof file === 'object' &&
  file !== null &&
  typeof (file as Document).url === 'string' &&
  typeof (file as Document).filename === 'string';

const formatBytes = (bytes: number, decimals = 2): string => {
  // if < 1kb
  if (bytes < 1024) return `${bytes} Bytes`;
  // if < 1mb
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(decimals)} KB`;
  // if < 1gb
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(decimals)} MB`;

  return `${(bytes / 1024 ** 3).toFixed(decimals)} GB`;
};

const dateStringToFormatedDate = (locale: Locale, dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return date.toLocaleDateString(locale, options);
};

/** The extension of the stored file, like "PDF" or "DOCX", which is what visitors know a type by. */
const fileTypeLabel = (filename: string): string | undefined => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 && dot < filename.length - 1 ? filename.slice(dot + 1).toUpperCase() : undefined;
};

const FileTypeIcon: React.FC<{ mimeType: string }> = ({ mimeType }) => {
  const className = 'text-conveniat-green h-5 w-5';
  if (mimeType.startsWith('image/')) return <FileImage className={className} aria-hidden="true" />;
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    return <FileSpreadsheet className={className} aria-hidden="true" />;
  }
  if (mimeType.includes('zip') || mimeType.includes('compressed')) {
    return <FileArchive className={className} aria-hidden="true" />;
  }
  return <FileText className={className} aria-hidden="true" />;
};

const FilePreview: React.FC<{ file: DownloadableFile; typeLabel: string | undefined }> = ({
  file,
  typeLabel,
}) => {
  const thumbnail = file.pdfThumbnailUrl ?? '';
  if (thumbnail !== '') {
    return (
      <span className="border-line flex h-14 w-11 shrink-0 overflow-hidden rounded-md border bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element -- the smallest size of the thumbnail already */}
        <img
          src={thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover object-top"
        />
      </span>
    );
  }

  return (
    <span className="relative flex h-10 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 transition duration-300 group-hover:bg-green-100/60">
      <FileTypeIcon mimeType={file.mimeType ?? ''} />
      {typeLabel !== undefined && (
        <span className="border-line absolute -right-1.5 -bottom-1 rounded-[4px] border bg-white px-1 text-[8px] leading-[1.4] font-bold text-green-700">
          {typeLabel}
        </span>
      )}
    </span>
  );
};

const FileRow: React.FC<{ file: DownloadableFile; openInNewTab: boolean; locale: Locale }> = ({
  file,
  openInNewTab,
  locale,
}) => {
  // the display name is localized without fallback, so it can be empty in any locale
  const title = (file.title ?? '').trim();
  const displayName = title === '' ? file.filename : title;
  const typeLabel = fileTypeLabel(file.filename);
  const details = [
    typeLabel,
    typeof file.filesize === 'number' ? formatBytes(file.filesize) : undefined,
    dateStringToFormatedDate(locale, file.updatedAt),
  ].filter((detail) => detail !== undefined);

  return (
    <li className="group transition-colors duration-300 hover:bg-green-50/40">
      <LinkComponent
        href={withLocaleParameter(file.url, locale)}
        openInNewTab={openInNewTab}
        className="block p-3 sm:p-4"
        hideExternalIcon
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
          <FilePreview file={file} typeLabel={typeLabel} />
          <div className="flex min-w-0 flex-col">
            <span
              className="text-conveniat-green group-hover:text-conveniat-green/80 block truncate text-sm font-semibold transition duration-200"
              title={displayName}
            >
              {displayName}
            </span>
            <span className="mt-0.5 text-xs text-gray-500">{details.join(' • ')}</span>
          </div>
          <div className="group-hover:bg-conveniat-green flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 group-hover:scale-105 group-hover:text-white">
            <Download className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>
      </LinkComponent>
    </li>
  );
};

/**
 * The documents of a file download block, one list per group under the group's title. Files the
 * visitor may not read, and groups left without any, are not shown.
 */
export const FileDownload: React.FC<FileDownloadType> = ({ groups, openInNewTab, locale }) => {
  // drafts skip validation, so a group can come without files or the block without groups
  const visibleGroups = (Array.isArray(groups) ? groups : [])
    .map((group) => ({
      id: group.id,
      title: (group.title ?? '').trim(),
      files: (Array.isArray(group.files) ? group.files : []).filter((file) => isDownloadable(file)),
    }))
    .filter((group) => group.files.length > 0);

  if (visibleGroups.length === 0) return;

  return (
    <div className="my-4 flex flex-col gap-5 sm:my-6">
      {visibleGroups.map((group, index) => (
        <div key={group.id ?? index}>
          {group.title !== '' && (
            <SectionLabel as="h3" className="mb-2">
              {group.title}
            </SectionLabel>
          )}
          <Card as="ul" divided>
            {group.files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                openInNewTab={openInNewTab === true}
                locale={locale}
              />
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
};
