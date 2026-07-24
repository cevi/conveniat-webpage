'use client';

import { FileText } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface DocumentInfo {
  id: string;
  originalFilename: string;
  filesize: number;
}

const ID_LOOKUP_REGEX = /^[a-f0-9-]{12,36}$/i;

export const FormSubmissionFilesCell: React.FC<{
  rowData?: { submissionData?: Array<{ field: string; value: unknown }> } & Record<string, unknown>;
}> = ({ rowData }) => {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);

  const submissionDataArray = Array.isArray(rowData?.submissionData) ? rowData.submissionData : [];

  const rawIds = submissionDataArray
    .map((item) => (typeof item.value === 'string' ? item.value : ''))
    .flatMap((val) => val.split(','))
    .map((id) => id.trim())
    .filter((id) => ID_LOOKUP_REGEX.test(id))
    .join(',');

  useEffect(() => {
    if (rawIds.length === 0) {
      return;
    }

    const fetchFiles = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/form-upload?ids=${encodeURIComponent(rawIds)}`);
        if (!response.ok) return;

        const data = (await response.json()) as {
          docs?: Array<{
            id: string;
            originalFilename?: string;
            filename?: string;
            filesize?: number;
          }>;
        };

        if (Array.isArray(data.docs) && data.docs.length > 0) {
          const fetchedDocuments: DocumentInfo[] = data.docs.map((item) => ({
            id: item.id,
            originalFilename:
              typeof item.originalFilename === 'string' && item.originalFilename.length > 0
                ? item.originalFilename
                : (item.filename ?? item.id),
            filesize: typeof item.filesize === 'number' ? item.filesize : 0,
          }));
          setDocuments(fetchedDocuments);
        }
      } catch {
        // ignore fetch error in cell
      }
    };

    void fetchFiles();
  }, [rawIds]);

  if (documents.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {documents.map((documentItem) => (
        <a
          key={documentItem.id}
          href={`/api/form-file/${documentItem.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          title={documentItem.originalFilename}
        >
          <FileText className="h-3 w-3 flex-shrink-0" />
          <span className="max-w-[150px] truncate">{documentItem.originalFilename}</span>
        </a>
      ))}
    </div>
  );
};

export default FormSubmissionFilesCell;
