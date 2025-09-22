import { LinkComponent } from '@/components/ui/link-component';
import type { Locale } from '@/types/types';
import { Paperclip } from 'lucide-react';
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

export const FileDownload: React.FC<FileDownloadType> = async ({ locale, ...block }) => {
  return (
    <div className="rounded-md border-2 border-gray-200 bg-white transition duration-200 hover:shadow-md sm:m-8">
      <LinkComponent
        href={block.file.url}
        openInNewTab={block.openInNewTab}
        className="block p-2"
        hideExternalIcon
      >
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
          <Paperclip className="mx-2 h-4 w-4 text-green-400" />
          <div className="flex flex-col overflow-hidden sm:flex-row sm:items-center sm:space-x-2">
            <div className="flex flex-col">
              <span className="text-conveniat-green truncate font-extrabold">
                {block.file.filename}
              </span>
            </div>
            <span className="text-conveniat-green text-xs sm:ml-2 sm:hidden">
              ({formatBytes(block.file.filesize)},{' '}
              {dateStringToFormatedDate(locale, block.file.updatedAt)})
            </span>
          </div>
          <div className="hidden sm:flex sm:flex-col sm:items-end">
            <span className="text-conveniat-green text-xs">
              {formatBytes(block.file.filesize)},{' '}
              {dateStringToFormatedDate(locale, block.file.updatedAt)}
            </span>
          </div>
        </div>
      </LinkComponent>
    </div>
  );
};
