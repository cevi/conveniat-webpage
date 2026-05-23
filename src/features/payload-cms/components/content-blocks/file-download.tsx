import { LinkComponent } from '@/components/ui/link-component';
import type { Locale } from '@/types/types';
import { Download, Paperclip } from 'lucide-react';
import React from 'react';

export interface FileDownloadType {
  file: {
    url: string;
    filename: string;
    filesize: number;
    updatedAt: string;
  };
  openInNewTab: boolean;
  locale: Locale;
}

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

export const FileDownload: React.FC<FileDownloadType> = ({ locale, ...block }) => {
  return (
    <div className="group hover:border-conveniat-green/30 my-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs transition-all duration-300 hover:bg-green-50/10 hover:shadow-md sm:my-6">
      <LinkComponent
        href={block.file.url}
        openInNewTab={block.openInNewTab}
        className="block p-3 sm:p-4"
        hideExternalIcon
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 sm:gap-4">
          <div className="text-conveniat-green flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 transition duration-300 group-hover:bg-green-100/60">
            <Paperclip className="text-conveniat-green h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span
              className="text-conveniat-green group-hover:text-conveniat-green/80 block truncate text-sm font-semibold transition duration-200"
              title={block.file.filename}
            >
              {block.file.filename}
            </span>
            <span className="mt-0.5 text-xs text-gray-500">
              {formatBytes(block.file.filesize)} •{' '}
              {dateStringToFormatedDate(locale, block.file.updatedAt)}
            </span>
          </div>
          <div className="group-hover:bg-conveniat-green flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 group-hover:scale-105 group-hover:text-white">
            <Download className="h-4 w-4" />
          </div>
        </div>
      </LinkComponent>
    </div>
  );
};
