import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { FileUploadBlock } from '@/features/payload-cms/components/form/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, Check, FileText, Upload, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useController,
  useFormContext,
  type FieldError,
  type FieldErrorsImpl,
  type FieldValues,
  type Merge,
  type UseFormRegister,
} from 'react-hook-form';

interface FileUploadItem {
  id: string;
  file?: File | undefined;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  /** How much of the file is up, 0 to 100, while it uploads. */
  percent?: number;
  /** Seconds the upload still needs at its pace so far, once that can be told. */
  secondsLeft?: number | undefined;
  docId?: string | undefined;
  error?: string | undefined;
}

const fileUploadTexts: {
  dropzoneText: StaticTranslationString;
  dragActiveText: StaticTranslationString;
  uploadingText: StaticTranslationString;
  uploadedText: StaticTranslationString;
  uploadErrorText: StaticTranslationString;
  fileTypeErrorText: StaticTranslationString;
  allowedTypesLabel: StaticTranslationString;
  secondsLeftText: StaticTranslationString;
  minutesLeftText: StaticTranslationString;
  retryText: StaticTranslationString;
  removeText: StaticTranslationString;
} = {
  dropzoneText: {
    en: 'Click to select or drag and drop files here',
    de: 'Klicken Sie zum Auswählen oder ziehen Sie Dateien hierhin',
    fr: 'Cliquez pour sélectionner ou glissez-déposez des fichiers ici',
  },
  dragActiveText: {
    en: 'Drop files here...',
    de: 'Dateien hier ablegen...',
    fr: 'Déposez les fichiers ici...',
  },
  uploadingText: {
    en: 'Uploading',
    de: 'Wird hochgeladen:',
    fr: 'Téléversement :',
  },
  uploadedText: {
    en: 'Uploaded',
    de: 'Hochgeladen',
    fr: 'Téléversé',
  },
  uploadErrorText: {
    en: 'Upload failed',
    de: 'Upload fehlgeschlagen',
    fr: 'Échec du téléversement',
  },
  fileTypeErrorText: {
    en: 'File type not allowed',
    de: 'Dateityp nicht erlaubt',
    fr: 'Type de fichier non autorisé',
  },
  allowedTypesLabel: {
    en: 'Allowed types:',
    de: 'Erlaubte Dateitypen:',
    fr: 'Types autorisés :',
  },
  secondsLeftText: {
    en: 'about {n} s left',
    de: 'noch etwa {n} s',
    fr: 'encore environ {n} s',
  },
  minutesLeftText: {
    en: 'about {n} min left',
    de: 'noch etwa {n} min',
    fr: 'encore environ {n} min',
  },
  retryText: { en: 'Try again', de: 'Erneut versuchen', fr: 'Réessayer' },
  removeText: { en: 'Remove {name}', de: '{name} entfernen', fr: 'Retirer {name}' },
};

/** How long an upload still takes, in the unit people read it in. */
const formatTimeLeft = (seconds: number, locale: Locale): string =>
  seconds < 90
    ? fileUploadTexts.secondsLeftText[locale].replace(
        '{n}',
        String(Math.max(1, Math.round(seconds))),
      )
    : fileUploadTexts.minutesLeftText[locale].replace('{n}', String(Math.round(seconds / 60)));

/** The ending of a file name in capitals, "PDF", shown next to its size. */
const fileType = (name: string): string | undefined => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toUpperCase() : undefined;
};

/**
 * Sends the form data with the upload's progress reported as it goes: `fetch` cannot report
 * the progress of a request body, and a plan of 20 MB takes minutes on camp wifi.
 */
const postWithProgress = (
  request: XMLHttpRequest,
  body: FormData,
  onProgress: (loaded: number, total: number) => void,
): Promise<{ ok: boolean; result: { docId?: string; error?: string } }> =>
  new Promise((resolve, reject) => {
    request.open('POST', '/api/form-upload');
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total);
    });
    request.addEventListener('load', () => {
      let result: { docId?: string; error?: string } = {};
      try {
        result = JSON.parse(request.responseText) as typeof result;
      } catch {
        // an answer that is not JSON, e.g. a proxy's error page, counts as a failure below
      }
      resolve({ ok: request.status >= 200 && request.status < 300, result });
    });
    request.addEventListener('error', () => reject(new Error('Upload failed')));
    request.addEventListener('abort', () => reject(new Error('Upload cancelled')));
    request.send(body);
  });

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The uploads under way, by file, called off when the field goes away, e.g. when a form
 * opened on the Hof dashboard is closed: an upload nobody waits for only uses camp wifi.
 */
const useRunningUploads = (): React.RefObject<Map<string, XMLHttpRequest>> => {
  const running = useRef(new Map<string, XMLHttpRequest>());
  useEffect(() => {
    const uploads = running.current;
    return (): void => {
      const requests = [...uploads.values()];
      // forgotten first, so the aborted uploads report nothing to a field that is gone
      uploads.clear();
      for (const request of requests) request.abort();
    };
  }, []);
  return running;
};

export const FileUpload: React.FC<
  {
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>> | undefined;
    registerAction?: UseFormRegister<string & FieldValues> | undefined;
    formId?: string | undefined;
  } & FileUploadBlock
> = ({
  name,
  label,
  required: requiredFromProperties,
  error,
  allowedFileTypes = 'all',
  customAllowedFileTypes,
  allowMultiple = false,
  formId,
}) => {
  const isRequiredField = requiredFromProperties === true;
  const hasError = error !== undefined;
  const locale = (useCurrentLocale(i18nConfig) ?? 'de') as Locale;

  const { control, setValue } = useFormContext();

  const { field } = useController({
    name,
    control,
    rules: {
      required: isRequiredField ? fieldIsRequiredText[locale] : false,
    },
  });

  const rawFieldValue = field.value as string | undefined;

  const [filesList, setFilesList] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const hasInteractedReference = useRef(false);
  const runningUploads = useRunningUploads();
  const fetchedIdsReference = useRef<string>('');

  const isDisabled =
    !allowMultiple &&
    filesList.some((item) => item.status === 'uploading' || item.status === 'success');

  // Restore uploaded file details if field.value already has document IDs (e.g. after step change, validation error, or page refresh)
  useEffect(() => {
    if (typeof rawFieldValue !== 'string' || rawFieldValue.trim() === '') {
      return;
    }

    const currentDocumentIds = rawFieldValue
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (currentDocumentIds.length === 0) return;

    // Check if all current document IDs are already present in filesList
    const existingDocumentIds = new Set(
      filesList
        .filter((item) => item.status === 'success' && typeof item.docId === 'string')
        .map((item) => item.docId),
    );

    const missingIds = currentDocumentIds.filter((id) => !existingDocumentIds.has(id));

    if (missingIds.length === 0 || fetchedIdsReference.current === rawFieldValue) {
      return;
    }

    fetchedIdsReference.current = rawFieldValue;

    const fetchDocumentInfo = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/form-upload?ids=${encodeURIComponent(rawFieldValue)}`);
        if (!response.ok) return;

        const data = (await response.json()) as {
          docs?: Array<{
            id: string;
            docId: string;
            originalFilename?: string;
            filesize?: number;
          }>;
        };

        if (Array.isArray(data.docs) && data.docs.length > 0) {
          const restoredItems: FileUploadItem[] = data.docs.map((documentItem) => ({
            id: documentItem.id,
            docId: documentItem.id,
            name:
              typeof documentItem.originalFilename === 'string' &&
              documentItem.originalFilename.length > 0
                ? documentItem.originalFilename
                : documentItem.id,
            size: typeof documentItem.filesize === 'number' ? documentItem.filesize : 0,
            status: 'success',
          }));

          setFilesList((previous) => {
            const previousNonFetched = previous.filter(
              (item) => item.status !== 'success' || !currentDocumentIds.includes(item.docId ?? ''),
            );
            return [...restoredItems, ...previousNonFetched];
          });
        }
      } catch (fetchError) {
        console.error('Failed to restore uploaded file info:', fetchError);
      }
    };

    void fetchDocumentInfo();
  }, [rawFieldValue, filesList]);

  // Sync internal uploaded document IDs with react-hook-form state when filesList changes
  useEffect(() => {
    const successDocumentIds = filesList
      .filter((item) => item.status === 'success' && typeof item.docId === 'string')
      .map((item) => item.docId)
      .join(', ');

    // Only set value if there are files or if the user actively removed/modified files
    if (
      (filesList.length > 0 || hasInteractedReference.current) &&
      rawFieldValue !== successDocumentIds
    ) {
      setValue(name, successDocumentIds, { shouldValidate: true });
    }
  }, [filesList, name, rawFieldValue, setValue]);

  // Sync background upload state to form state so form controls can disable submit buttons
  const isUploadingThisField = filesList.some((item) => item.status === 'uploading');

  useEffect(() => {
    setValue(`_isUploading_${name}`, isUploadingThisField);
  }, [isUploadingThisField, name, setValue]);

  // Compute accept attribute for HTML file input based on allowedFileTypes
  const acceptAttribute = useMemo(() => {
    switch (allowedFileTypes) {
      case 'pdf': {
        return '.pdf,application/pdf';
      }
      case 'images': {
        return 'image/*,.png,.jpg,.jpeg,.webp,.gif';
      }
      case 'documents': {
        return '.pdf,.doc,.docx,.xls,.xlsx,.txt';
      }
      case 'custom': {
        return customAllowedFileTypes ?? '*';
      }
      default: {
        return;
      }
    }
  }, [allowedFileTypes, customAllowedFileTypes]);

  const updateItem = useCallback(
    (id: string, changes: Partial<FileUploadItem>): void =>
      setFilesList((previous) => previous.map((f) => (f.id === id ? { ...f, ...changes } : f))),
    [],
  );

  const handleUploadFile = useCallback(
    async (item: FileUploadItem): Promise<void> => {
      if (item.file === undefined || formId === undefined || formId === '') return;

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('formId', formId);
      formData.append('fieldName', name);

      const request = new XMLHttpRequest();
      runningUploads.current.set(item.id, request);
      const startedAt = Date.now();
      // the browser reports many times a percent; a render each would stall a cheap phone
      let reported = -1;
      try {
        const { ok, result } = await postWithProgress(request, formData, (loaded, total) => {
          const percent = Math.round((loaded / total) * 100);
          if (percent === reported) return;
          reported = percent;
          const elapsed = (Date.now() - startedAt) / 1000;
          // a pace needs a second and a few percent before it says anything
          const secondsLeft =
            elapsed > 1 && loaded > 0 ? ((total - loaded) / loaded) * elapsed : undefined;
          updateItem(item.id, { percent, secondsLeft });
        });

        if (!ok || typeof result.docId !== 'string') {
          updateItem(item.id, {
            status: 'error',
            error: result.error ?? fileUploadTexts.uploadErrorText[locale],
          });
          return;
        }
        updateItem(item.id, { status: 'success', docId: result.docId });
      } catch {
        // removed meanwhile: nothing left to report on
        if (!runningUploads.current.has(item.id)) return;
        // no signal, usually: the file stays, so one tap sends it again
        updateItem(item.id, { status: 'error', error: fileUploadTexts.uploadErrorText[locale] });
      } finally {
        runningUploads.current.delete(item.id);
      }
    },
    [formId, name, locale, updateItem, runningUploads],
  );

  const retryUpload = (item: FileUploadItem): void => {
    updateItem(item.id, {
      status: 'uploading',
      percent: 0,
      secondsLeft: undefined,
      error: undefined,
    });
    void handleUploadFile(item);
  };

  const processSelectedFiles = useCallback(
    (newFiles: FileList | File[]): void => {
      if (isDisabled) return;
      hasInteractedReference.current = true;

      const selected = [...newFiles];
      if (selected.length === 0) return;

      const firstFile = selected[0];
      if (firstFile === undefined) return;

      const filesToProcess = allowMultiple ? selected : [firstFile];

      const newItems: FileUploadItem[] = filesToProcess.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        status: 'uploading',
        percent: 0,
      }));

      if (allowMultiple) {
        setFilesList((previous) => [...previous, ...newItems]);
      } else {
        setFilesList(newItems);
      }

      for (const item of newItems) {
        void handleUploadFile(item);
      }
    },
    [allowMultiple, isDisabled, handleUploadFile],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (isDisabled) return;
    if (event.target.files !== null) {
      processSelectedFiles(event.target.files);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (isDisabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (isDisabled) return;
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    if (isDisabled) return;
    setIsDragOver(false);
    if (event.dataTransfer.files.length > 0) {
      processSelectedFiles(event.dataTransfer.files);
    }
  };

  const removeFile = (id: string): void => {
    hasInteractedReference.current = true;
    // a file taken out stops using the connection at once
    const running = runningUploads.current.get(id);
    runningUploads.current.delete(id);
    running?.abort();
    setFilesList((previous) => previous.filter((item) => item.id !== id));
  };

  let dropzoneBorderStyle = 'border-gray-200 bg-green-100 hover:border-gray-300 hover:bg-white';
  if (isDisabled) {
    dropzoneBorderStyle =
      'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed pointer-events-none';
  } else if (hasError) {
    dropzoneBorderStyle = 'border-red-400 bg-red-50';
  } else if (isDragOver) {
    // border, glow and words change before the drop, so the user sees it will land
    dropzoneBorderStyle = 'border-conveniat-green bg-green-50 ring-4 ring-green-100';
  }

  return (
    <div className="mb-4">
      <label className="mb-1 block font-['Inter'] text-sm font-medium text-gray-500" htmlFor={name}>
        {label}
        {isRequiredField && <Required />}
      </label>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-all duration-200',
          dropzoneBorderStyle,
        )}
      >
        <input
          id={name}
          type="file"
          accept={acceptAttribute}
          multiple={allowMultiple}
          disabled={isDisabled}
          onChange={handleInputChange}
          className={cn(
            'absolute inset-0 opacity-0',
            isDisabled ? 'pointer-events-none cursor-not-allowed' : 'cursor-pointer',
          )}
        />

        <div className="pointer-events-none flex flex-col items-center text-center">
          <Upload className="mb-2 h-8 w-8 text-gray-400" />
          <p className="font-['Inter'] text-sm font-medium text-gray-700">
            {isDragOver
              ? fileUploadTexts.dragActiveText[locale]
              : fileUploadTexts.dropzoneText[locale]}
          </p>
          {typeof acceptAttribute === 'string' && acceptAttribute.length > 0 && (
            <p className="mt-1 text-xs text-gray-400">
              {fileUploadTexts.allowedTypesLabel[locale]} {acceptAttribute.replaceAll(',', ', ')}
            </p>
          )}
        </div>
      </div>

      {/* Selected Files List: each file with its type and size, its own progress and retry */}
      {filesList.length > 0 && (
        <ul className="mt-3 space-y-2">
          {filesList.map((item) => {
            const details = [fileType(item.name), formatFileSize(item.size)].filter(
              (part) => part !== undefined,
            );
            return (
              <li
                key={item.id}
                className={cn(
                  'space-y-2 rounded-md border bg-white p-3 shadow-xs',
                  item.status === 'error' ? 'border-red-200' : 'border-gray-100',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-['Inter'] text-sm font-medium text-gray-700">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">{details.join(' · ')}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {item.status === 'uploading' && (
                      <span className="text-xs text-gray-600 tabular-nums">
                        {item.percent ?? 0} %
                      </span>
                    )}
                    {item.status === 'success' && (
                      <span className="flex items-center text-xs text-green-600">
                        <Check className="mr-1.5 h-4 w-4" aria-hidden />
                        {fileUploadTexts.uploadedText[locale]}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeFile(item.id)}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      aria-label={fileUploadTexts.removeText[locale].replace('{name}', item.name)}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>

                {item.status === 'uploading' && (
                  <div className="space-y-1">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-gray-100"
                      role="progressbar"
                      aria-label={`${fileUploadTexts.uploadingText[locale]} ${item.name}`}
                      aria-valuenow={item.percent ?? 0}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="bg-conveniat-green h-full rounded-full transition-[width] motion-reduce:transition-none"
                        style={{ width: `${item.percent ?? 0}%` }}
                      />
                    </div>
                    {item.secondsLeft !== undefined && (
                      <p className="text-xs text-gray-500">
                        {formatTimeLeft(item.secondsLeft, locale)}
                      </p>
                    )}
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center text-xs text-red-600">
                      <AlertCircle className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
                      {item.error ?? fileUploadTexts.uploadErrorText[locale]}
                    </p>
                    {item.file !== undefined && (
                      <button
                        type="button"
                        onClick={() => retryUpload(item)}
                        className="text-conveniat-green min-h-10 cursor-pointer px-2 text-sm font-semibold hover:underline"
                      >
                        {fileUploadTexts.retryText[locale]}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasError && (
        <p className="mt-1 text-xs text-red-600">{(error as { message?: string }).message}</p>
      )}
    </div>
  );
};
