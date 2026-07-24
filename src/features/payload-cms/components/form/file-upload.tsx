import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { FileUploadBlock } from '@/features/payload-cms/components/form/types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { AlertCircle, Check, FileText, Loader2, Upload, X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
    en: 'Uploading in background...',
    de: 'Wird im Hintergrund hochgeladen...',
    fr: 'Téléversement en arrière-plan...',
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
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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

  const isDisabled =
    !allowMultiple &&
    filesList.some((item) => item.status === 'uploading' || item.status === 'success');

  // Sync internal uploaded document IDs with react-hook-form state
  useEffect(() => {
    const successDocumentIds = filesList
      .filter((item) => item.status === 'success' && typeof item.docId === 'string')
      .map((item) => item.docId)
      .join(', ');

    if (rawFieldValue !== successDocumentIds) {
      setValue(name, successDocumentIds, { shouldValidate: true });
    }
  }, [filesList, name, rawFieldValue, setValue]);

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

  const handleUploadFile = useCallback(
    async (item: FileUploadItem): Promise<void> => {
      if (item.file === undefined || formId === undefined || formId === '') return;

      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('formId', formId);
      formData.append('fieldName', name);

      try {
        const response = await fetch('/api/form-upload', {
          method: 'POST',
          body: formData,
        });

        const result = (await response.json()) as {
          docId?: string;
          error?: string;
        };

        if (!response.ok || typeof result.docId !== 'string') {
          setFilesList((previous) =>
            previous.map((f) =>
              f.id === item.id
                ? {
                    ...f,
                    status: 'error',
                    error: result.error ?? fileUploadTexts.uploadErrorText[locale],
                  }
                : f,
            ),
          );
          return;
        }

        setFilesList((previous) =>
          previous.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'success',
                  docId: result.docId,
                }
              : f,
          ),
        );
      } catch (error_) {
        setFilesList((previous) =>
          previous.map((f) =>
            f.id === item.id
              ? {
                  ...f,
                  status: 'error',
                  error:
                    error_ instanceof Error
                      ? error_.message
                      : fileUploadTexts.uploadErrorText[locale],
                }
              : f,
          ),
        );
      }
    },
    [formId, name, locale],
  );

  const processSelectedFiles = useCallback(
    (newFiles: FileList | File[]): void => {
      if (isDisabled) return;
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
    processSelectedFiles(event.dataTransfer.files);
  };

  const removeFile = (id: string): void => {
    setFilesList((previous) => previous.filter((item) => item.id !== id));
  };

  let dropzoneBorderStyle = 'border-gray-200 bg-green-100 hover:border-gray-300 hover:bg-white';
  if (isDisabled) {
    dropzoneBorderStyle =
      'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed pointer-events-none';
  } else if (hasError) {
    dropzoneBorderStyle = 'border-red-400 bg-red-50';
  } else if (isDragOver) {
    dropzoneBorderStyle = 'border-conveniat-green bg-green-50';
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

        <div className="flex flex-col items-center text-center">
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

      {/* Selected Files List */}
      {filesList.length > 0 && (
        <ul className="mt-3 space-y-2">
          {filesList.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-md border border-gray-100 bg-white p-3 shadow-xs"
            >
              <div className="flex items-center space-x-3 truncate">
                <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" />
                <div className="truncate">
                  <p className="truncate font-['Inter'] text-sm font-medium text-gray-700">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-400">{formatFileSize(item.size)}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {item.status === 'uploading' && (
                  <div className="flex items-center text-amber-600">
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    <span className="text-xs">{fileUploadTexts.uploadingText[locale]}</span>
                  </div>
                )}

                {item.status === 'success' && (
                  <div className="flex items-center text-green-600">
                    <Check className="mr-1.5 h-4 w-4" />
                    <span className="text-xs">{fileUploadTexts.uploadedText[locale]}</span>
                  </div>
                )}

                {item.status === 'error' && (
                  <div className="flex items-center text-red-600">
                    <AlertCircle className="mr-1.5 h-4 w-4" />
                    <span className="text-xs">
                      {item.error ?? fileUploadTexts.uploadErrorText[locale]}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeFile(item.id)}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {hasError && (
        <p className="mt-1 text-xs text-red-600">{(error as { message?: string }).message}</p>
      )}
    </div>
  );
};
