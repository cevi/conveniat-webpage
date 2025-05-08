import { Paperclip } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export interface FileDownloadType {
  file: {
    url: string;
    filename: string;
    filesize: number;
    updatedAt: string;
  };
  openInNewTab: boolean;
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

const dateStringToFormatedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };
  return date.toLocaleDateString('en-CH', options);
};

export const FileDownload: React.FC<FileDownloadType> = ({ ...block }) => {
  return (
    <div className="border-2 border-gray-200 bg-white rounded-md hover:shadow-md transition duration-200 sm:m-8">
      <Link
        href={block.file.url}
        target={block.openInNewTab ? '_blank' : undefined}
        className="block p-2"
      >
        <div className="grid grid-cols-[auto_1fr_auto] gap-2 items-center">
          <Paperclip className="mx-2 h-4 w-4 text-green-400" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 overflow-hidden">
            <div className="flex flex-col">
              <span className="font-extrabold text-conveniat-green truncate">
                {block.file.filename}
              </span>
            </div>
            <span className="text-xs text-conveniat-green sm:ml-2 sm:hidden">
              ({formatBytes(block.file.filesize)}, {dateStringToFormatedDate(block.file.updatedAt)})
            </span>
          </div>
          <div className="hidden sm:flex sm:flex-col sm:items-end">
            <span className="text-xs text-conveniat-green">
              {formatBytes(block.file.filesize)}, {dateStringToFormatedDate(block.file.updatedAt)}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};
