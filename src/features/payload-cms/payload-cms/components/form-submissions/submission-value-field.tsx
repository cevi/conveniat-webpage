'use client';

import { useField } from '@payloadcms/ui';
import { Download, ExternalLink, FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface DocumentInfo {
  id: string;
  originalFilename: string;
  filesize: number;
  url?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const SubmissionValueField: React.FC<{
  path: string;
  readOnly?: boolean;
}> = ({ path, readOnly = false }) => {
  const { value, setValue } = useField<string>({ path });
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);

  useEffect(() => {
    if (typeof value !== 'string' || value.trim() === '') {
      return;
    }

    const potentialIds = value
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (potentialIds.length === 0) {
      return;
    }

    const fetchDocumentInfo = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/form-upload?ids=${encodeURIComponent(value)}`);
        if (!response.ok) {
          setDocuments([]);
          return;
        }

        const data = (await response.json()) as {
          docs?: Array<{
            id: string;
            originalFilename?: string;
            filename?: string;
            filesize?: number;
            url?: string;
          }>;
        };

        if (Array.isArray(data.docs) && data.docs.length > 0) {
          const resolvedDocuments: DocumentInfo[] = data.docs.map((item) => ({
            id: item.id,
            originalFilename:
              typeof item.originalFilename === 'string' && item.originalFilename.length > 0
                ? item.originalFilename
                : (item.filename ?? item.id),
            filesize: typeof item.filesize === 'number' ? item.filesize : 0,
            url: item.url,
          }));
          setDocuments(resolvedDocuments);
        } else {
          setDocuments([]);
        }
      } catch {
        setDocuments([]);
      }
    };

    void fetchDocumentInfo();
  }, [value]);

  return (
    <div className="field-type text mb-3">
      <label className="field-label" htmlFor={path}>
        Value <span className="required">*</span>
      </label>
      <textarea
        id={path}
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => setValue(event.target.value)}
        readOnly={readOnly}
        rows={1}
        className="w-full rounded border border-gray-300 p-2 font-mono text-sm focus:border-blue-500 focus:outline-none"
      />

      {documents.length > 0 && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-gray-200 bg-gray-50 p-3">
          <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            Uploaded Document(s)
          </span>
          {documents.map((documentItem) => (
            <div
              key={documentItem.id}
              className="flex items-center justify-between rounded border border-gray-200 bg-white p-2.5 shadow-2xs"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <FileText className="h-4 w-4 flex-shrink-0 text-blue-600" />
                <span className="truncate text-sm font-medium text-gray-800">
                  {documentItem.originalFilename}
                </span>
                <span className="text-xs text-gray-400">
                  ({formatFileSize(documentItem.filesize)})
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/api/form-file/${documentItem.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 rounded bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download / View</span>
                </a>
                <a
                  href={`/admin/collections/form_collection/${documentItem.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Payload Admin</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SubmissionValueField;
