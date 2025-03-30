import React from 'react';
import Link from 'next/link';
import { Paperclip } from 'lucide-react';

export type FileDownloadType = {
  file: {
    url: string;
    filename: string;
    filesize: number;
  };
  openInNewTab: boolean;
};

const formatBytes = (bytes: number, decimals = 2): string => {
  // if < 1kb
  if (bytes < 1024) return `${bytes} Bytes`;
  // if < 1mb
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(decimals)} KB`;
  // if < 1gb
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(decimals)} MB`;

  return `${(bytes / 1024 ** 3).toFixed(decimals)} GB`;
};

export const FileDownload: React.FC<FileDownloadType> = async ({ ...block }) => {
  return (
    <>
      <div className="border border-conveniat-green p-2">
        <Link
          href={block.file.url}
          target={block.openInNewTab ? '_blank' : ''}
          className="flex items-center space-x-2"
        >
          <Paperclip className="h-4 w-4 text-conveniat-green" />
          <span>{block.file.filename}</span>
          <span>{formatBytes(block.file.filesize)}</span>
        </Link>
      </div>
    </>
  );
};
