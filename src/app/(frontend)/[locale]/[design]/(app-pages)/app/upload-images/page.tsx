'use client';

import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { CopyrightModal } from '@/features/image-submission/copyright-modal';
import { DescriptionInput } from '@/features/image-submission/description-input';
import { FilePreviewList } from '@/features/image-submission/file-preview-list';
import { FileUploadZone } from '@/features/image-submission/file-upload-zone';
import { SubmitButton } from '@/features/image-submission/submit-button';
import { useUserUpload } from '@/features/payload-cms/hooks/use-user-upload';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Image as LucideImageIcon, Sparkles } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import type React from 'react';
import { useState } from 'react';

const selectAtLeastOne: StaticTranslationString = {
  en: 'Please select at least one image',
  de: 'Bitte wähle mindestens ein Bild aus',
  fr: 'Veuillez sélectionner au moins une image',
};

const descriptionRequired: StaticTranslationString = {
  en: 'Please write a short description of the image',
  de: 'Bitte schreibe eine kurze Beschreibung des Bildes',
  fr: "Veuillez écrire une courte description de l'image",
};

const uploadError: StaticTranslationString = {
  en: 'Error uploading images',
  de: 'Fehler beim Hochladen der Bilder',
  fr: 'Erreur lors du téléchargement des images',
};

const pageTitle: StaticTranslationString = {
  en: 'Image Upload',
  de: 'Bild-Upload',
  fr: "Téléchargement d'images",
};

const pageDescription: StaticTranslationString = {
  en: 'Upload your images and confirm the required agreements',
  de: 'Lade deine Bilder hoch und bestätige die erforderlichen Vereinbarungen',
  fr: 'Téléchargez vos images et confirmez les accords requis',
};

const successTitle: StaticTranslationString = {
  en: 'Upload Successful!',
  de: 'Upload erfolgreich!',
  fr: 'Téléchargement réussi!',
};

const successMessage: StaticTranslationString = {
  en: 'Thank you for your submission. Your images have been uploaded successfully.',
  de: 'Vielen Dank für deine Einreichung. Deine Bilder wurden erfolgreich hochgeladen.',
  fr: 'Merci pour votre soumission. Vos images ont été téléchargées avec succès.',
};

const uploadSecurelyTransferred: StaticTranslationString = {
  en: 'Your images have been securely transferred.',
  de: 'Deine Bilder wurden sicher übertragen.',
  fr: 'Vos images ont été transférées en toute sécurité.',
};

const submitMoreButton: StaticTranslationString = {
  en: 'Submit More Images',
  de: 'Weitere Bilder einreichen',
  fr: "Soumettre plus d'images",
};

const imageTooBig: StaticTranslationString = {
  en: 'Your uploaded image is too big',
  de: 'Dein Bild ist zu gross',
  fr: 'Votre image téléchargée est trop grande',
};

const descriptionTooLong: StaticTranslationString = {
  en: 'Description too long (max 1000 characters)',
  de: 'Beschreibung zu lang (max. 1000 Zeichen)',
  fr: 'Description trop longue (max 1000 caractères)',
};

const selectedImages: StaticTranslationString = {
  en: 'Selected Images',
  de: 'Ausgewählte Bilder',
  fr: 'Images sélectionnées',
};

const duplicateImageError: StaticTranslationString = {
  en: 'This image has already been uploaded.',
  de: 'Dieses Bild wurde bereits hochgeladen.',
  fr: 'Cette image a déjà été téléchargée.',
};

interface FileItem {
  file: File;
  error?: string;
  descriptionError?: string;
}

const ImageUploadPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessView, setShowSuccessView] = useState(false);

  const { uploadImage, isUploading } = useUserUpload();

  const checkImageDimensions = (
    file: File,
  ): Promise<{ isValid: boolean; width: number; height: number }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        const img = new Image();
        img.addEventListener('load', () => {
          const width = img.width;
          const height = img.height;
          resolve({
            isValid: (width >= 1920 && height >= 1080) || (height >= 1920 && width >= 1080),
            width,
            height,
          });
        });
        img.src = event.target?.result as string;
      });
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (!files) return;

    setErrorMessage('');

    const newFiles = [...files].filter((file) => file.type.startsWith('image/'));

    void (async (): Promise<void> => {
      const newFileItems: FileItem[] = await Promise.all(
        newFiles.map(async (file) => {
          const { isValid: isValidDimensions, width, height } = await checkImageDimensions(file);
          const isValidSize = file.size < 10 * 1024 * 1024;
          let error: string | undefined;

          if (!isValidDimensions) {
            const minRequest = '1920x1080px';
            const current = `${width}x${height}px`;

            if (locale === 'de') {
              error = `Auflösung zu gering: ${current}. Mindestanforderung: ${minRequest}.`;
            } else if (locale === 'fr') {
              error = `Résolution trop faible: ${current}. Minimum requis: ${minRequest}.`;
            } else {
              error = `Resolution too low: ${current}. Minimum required: ${minRequest}.`;
            }
          } else if (!isValidSize) {
            error = imageTooBig[locale];
          }

          if (error) {
            return { file, error };
          }
          return { file };
        }),
      );

      // Filter out files that are already selected to prevent duplicates
      const nonDuplicateItems = newFileItems.filter(
        (newItem) => !selectedFiles.some((existing) => existing.file.name === newItem.file.name),
      );

      setSelectedFiles((previous) => [...previous, ...nonDuplicateItems]);
    })();
  };

  const removeFile = (index: number): void => {
    setSelectedFiles((previous) => {
      const fileToRemove = previous[index];
      setFileDescriptions((previous_) => {
        const updated = { ...previous_ };
        delete updated[fileToRemove?.file.name ?? ''];
        return updated;
      });
      return previous.filter((_, index_) => index_ !== index);
    });
  };

  const handleDescriptionChange = (fileName: string, description: string): void => {
    setFileDescriptions((previous) => ({ ...previous, [fileName]: description }));
    // Clear description error for this file if needed
    setSelectedFiles((previous) =>
      previous.map((item) => {
        if (item.file.name === fileName) {
          return {
            file: item.file,
            ...(item.error ? { error: item.error } : {}),
          };
        }
        return item;
      }),
    );
  };

  const clearForm = (): void => {
    setSelectedFiles([]);
    setFileDescriptions({});

    setErrorMessage('');
  };

  const resetToForm = (): void => {
    setShowSuccessView(false);
    clearForm();
  };

  const handleFormSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    setErrorMessage('');

    const validFiles = selectedFiles.filter((item) => !item.error);

    if (validFiles.length === 0) {
      setErrorMessage(selectAtLeastOne[locale]);
      return;
    }

    // Validate descriptions per file
    const filesWithValidation: FileItem[] = selectedFiles.map((item) => {
      if (item.error) return item;

      const description = fileDescriptions[item.file.name]?.trim() ?? '';
      let descriptionError: string | undefined;

      if (description === '') {
        descriptionError = descriptionRequired[locale];
      } else if (description.length > 1000) {
        descriptionError = descriptionTooLong[locale];
      }

      if (descriptionError) {
        return { ...item, descriptionError };
      }

      return {
        file: item.file,
        ...(item.error ? { error: item.error } : {}),
      };
    });

    const hasDescriptionErrors = filesWithValidation.some((item) => !!item.descriptionError);

    if (hasDescriptionErrors) {
      setSelectedFiles(filesWithValidation);
      return;
    }

    setShowCopyrightModal(true);
  };

  const handleFinalUpload = async (): Promise<void> => {
    const validFiles = selectedFiles.filter((item) => !item.error);

    try {
      const results = await Promise.all(
        validFiles.map(async (item) => {
          const description = fileDescriptions[item.file.name]?.trim() ?? '';
          const response = await uploadImage(item.file, description);
          return { fileName: item.file.name, response };
        }),
      );

      const failedUploads = results.filter((r) => r.response.error);

      if (failedUploads.length === 0) {
        setShowSuccessView(true);
        setShowCopyrightModal(false);
      } else {
        // Update state with errors for specific files
        setSelectedFiles((previous) =>
          previous.map((item) => {
            const failure = failedUploads.find((f) => f.fileName === item.file.name);
            if (failure) {
              let uploadFailureMessage = failure.response.message;
              if (uploadFailureMessage === 'This image has already been uploaded.') {
                uploadFailureMessage = duplicateImageError[locale];
              }
              return { ...item, error: uploadFailureMessage };
            }
            return item;
          }),
        );
        setShowCopyrightModal(false);
      }
    } catch (error) {
      setErrorMessage(
        `${uploadError[locale]}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      setShowCopyrightModal(false);
    }
  };

  const isSubmitDisabled = selectedFiles.filter((f) => !f.error).length === 0;

  if (showSuccessView) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="bg-conveniat-green/10 relative mb-10 flex h-36 w-36 items-center justify-center rounded-full shadow-inner">
            <div className="bg-conveniat-green/20 absolute inset-0 animate-ping rounded-full opacity-20 duration-2000" />
            <LucideImageIcon className="text-conveniat-green h-14 w-14" />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="h-10 w-10 animate-pulse text-yellow-400 drop-shadow-sm" />
            </div>
            <div className="absolute -bottom-1 -left-1">
              <Sparkles className="h-6 w-6 animate-bounce text-yellow-400 drop-shadow-sm delay-150" />
            </div>
          </div>

          <HeadlineH1 className="mb-4 text-center">{successTitle[locale]}</HeadlineH1>

          <h2 className="mb-3 text-xl font-bold tracking-tight text-gray-900 md:text-2xl">
            {successMessage[locale]}
          </h2>
          <p className="mb-10 text-lg font-medium text-gray-500">
            {uploadSecurelyTransferred[locale]}
          </p>

          <button
            onClick={resetToForm}
            className="bg-conveniat-green shadow-conveniat-green/20 hover:bg-conveniat-green-dark focus:ring-conveniat-green/30 flex transform cursor-pointer items-center justify-center gap-3 rounded-full px-8 py-4 text-base font-bold tracking-wide text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus:ring-4 active:translate-y-0"
          >
            <LucideImageIcon className="h-5 w-5" />
            {submitMoreButton[locale]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto min-h-screen max-w-2xl bg-gray-50/50 px-4 py-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
        <p className="mt-2 text-base text-gray-500">{pageDescription[locale]}</p>
      </div>

      <form onSubmit={(event) => void handleFormSubmit(event)} className="space-y-8">
        {errorMessage !== '' && (
          <div className="flex items-center gap-4 rounded-xl border border-red-100 bg-red-50 p-4 text-red-800">
            <LucideImageIcon className="h-6 w-6 shrink-0 opacity-80" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Selected Files List - Rendered FIRST as requested */}
        {selectedFiles.length > 0 && (
          <div className="space-y-6">
            <div className="mb-2 flex items-center justify-between px-2">
              <label className="text-xl font-extrabold tracking-tight text-gray-900">
                {selectedImages[locale]} ({selectedFiles.length})
              </label>
            </div>
            {selectedFiles.map((fileItem, index) => (
              <div
                key={fileItem.file.name}
                className="group overflow-hidden rounded-3xl border border-gray-200/60 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <FilePreviewList
                  files={[fileItem.file]}
                  onRemoveFile={() => removeFile(index)}
                  {...(fileItem.error ? { errorMessage: fileItem.error } : {})}
                />
                {/* Only show description input if there is no error on the file */}
                {!fileItem.error && (
                  <div className="px-5 pb-5">
                    <DescriptionInput
                      value={fileDescriptions[fileItem.file.name] || ''}
                      onChange={(desc) => handleDescriptionChange(fileItem.file.name, desc)}
                    />
                    {fileItem.descriptionError && (
                      <p className="mt-2 text-sm font-medium text-red-600">
                        {fileItem.descriptionError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Zone - Turns into 'Add more' area if files exist */}
        <div className="space-y-6">
          <FileUploadZone onFileSelect={handleFileSelect} compact={selectedFiles.length > 0} />
        </div>

        <div
          className={cn(
            selectedFiles.length > 0
              ? 'pointer-events-none fixed right-0 bottom-[76px] left-0 z-40 p-4 md:static md:p-0'
              : '',
          )}
        >
          <div className="pointer-events-auto container mx-auto max-w-2xl md:px-0">
            <SubmitButton
              isDisabled={isSubmitDisabled}
              fileCount={selectedFiles.filter((f) => !f.error).length}
              isLoading={isUploading}
            />
          </div>
        </div>
        {/* Spacer for sticky button on mobile */}
        {selectedFiles.length > 0 && <div className="h-32 md:hidden" />}

        <CopyrightModal
          open={showCopyrightModal}
          onOpenChange={setShowCopyrightModal}
          onConfirm={() => void handleFinalUpload()}
          isUploading={isUploading}
        />
      </form>
    </div>
  );
};

export default ImageUploadPage;
