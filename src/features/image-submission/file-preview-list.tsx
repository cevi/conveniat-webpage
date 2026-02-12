'use client';

import { cn } from '@/utils/tailwindcss-override';
import { Image as LucideImageIcon, Trash2 } from 'lucide-react';
import React from 'react';

interface FilePreviewListProperties {
  files: File[];
  onRemoveFile: (index: number) => void;
  errorMessage?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const index = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, index)).toFixed(2)} ${sizes[index]}`;
};

const FilePreviewItem: React.FC<{
  file: File;
  index: number;
  errorMessage?: string | undefined;
  onRemove: (index: number) => void;
}> = ({ file, index, errorMessage, onRemove }) => {
  const [preview, setPreview] = React.useState<string | undefined>();

  React.useEffect((): (() => void) => {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Free memory when component is unmounted
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded border p-3 transition-colors',
        errorMessage ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={file.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <LucideImageIcon
                  className={cn('h-4 w-4', errorMessage ? 'text-red-400' : 'text-gray-400')}
                />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <span
              className={cn(
                'truncate text-sm font-medium',
                errorMessage ? 'text-red-900' : 'text-gray-700',
              )}
            >
              {file.name}
            </span>
            <span className={cn('text-xs', errorMessage ? 'text-red-500' : 'text-gray-500')}>
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
        {errorMessage && <p className="text-xs font-medium text-red-600">{errorMessage}</p>}
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded text-gray-400 transition-colors hover:bg-white hover:text-red-600 hover:shadow-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
        aria-label={`Remove ${file.name}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
};

export const FilePreviewList: React.FC<FilePreviewListProperties> = ({
  files,
  onRemoveFile,
  errorMessage,
}) => {
  if (files.length === 0) return <></>;

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <FilePreviewItem
          key={`${file.name}-${index}`}
          file={file}
          index={index}
          onRemove={onRemoveFile}
          errorMessage={errorMessage}
        />
      ))}
    </div>
  );
};
