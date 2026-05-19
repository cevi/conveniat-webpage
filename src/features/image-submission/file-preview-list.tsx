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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreview(objectUrl);

    // Free memory when component is unmounted
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 transition-colors',
        errorMessage ? 'bg-red-50' : 'bg-transparent',
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-gray-100 shadow-sm">
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
                'truncate text-base font-semibold',
                errorMessage ? 'text-red-900' : 'text-gray-900',
              )}
            >
              {file.name}
            </span>
            <span className={cn('text-xs', errorMessage ? 'text-red-500' : 'text-gray-500')}>
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
        {errorMessage && <p className="mt-1 text-sm font-medium text-red-600">{errorMessage}</p>}
      </div>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none"
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
