'use client';

import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ConfirmationCheckboxes } from '@/features/image-submission/confirmation-checkboxes';
import { DescriptionInput } from '@/features/image-submission/description-input';
import { FilePreviewList } from '@/features/image-submission/file-preview-list';
import { FileUploadZone } from '@/features/image-submission/file-upload-zone';
import { SubmitButton } from '@/features/image-submission/submit-button';
import { useUserUpload } from '@/features/payload-cms/hooks/use-user-upload';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
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

const confirmationsRequired: StaticTranslationString = {
  en: 'Please accept both confirmations to proceed',
  de: 'Bitte akzeptiere beide Bestätigungen, um fortzufahren',
  fr: 'Veuillez accepter les deux confirmations pour continuer',
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

const ImageUploadPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  interface FileItem {
    file: File;
    error?: string;
    descriptionError?: string;
  }

  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  // Privacy accepted is removed as it is covered by onboarding
  const [rightsTransferred, setRightsTransferred] = useState(false);

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
    setRightsTransferred(false);
    setErrorMessage('');
  };

  const resetToForm = (): void => {
    setShowSuccessView(false);
    clearForm();
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
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

    if (!rightsTransferred) {
      setErrorMessage(confirmationsRequired[locale]);
      return;
    }

    try {
      const uploadResults = await Promise.all(
        validFiles.map(async (item) => {
          const description = fileDescriptions[item.file.name]?.trim() ?? '';
          const response = await uploadImage(item.file, description);
          return response;
        }),
      );
      const failedUploads = uploadResults.filter((response) => response.error);
      if (failedUploads.length === 0) {
        setShowSuccessView(true);
      } else {
        setErrorMessage(`${uploadError[locale]}: ${failedUploads[0]?.message ?? ''}`);
      }
    } catch (error) {
      setErrorMessage(
        `${uploadError[locale]}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  const isSubmitDisabled = selectedFiles.filter((f) => !f.error).length === 0 || !rightsTransferred;

  if (showSuccessView) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 border-b border-gray-200 pb-6 text-center">
          <HeadlineH1>{successTitle[locale]}</HeadlineH1>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <div className="relative mb-8 flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-tr from-blue-50 to-blue-100 shadow-inner">
            <div className="absolute inset-0 animate-ping rounded-full bg-blue-400 opacity-10 duration-[2000ms]" />
            <LucideImageIcon className="h-12 w-12 text-blue-600" />
            <div className="absolute -top-3 -right-3">
              <Sparkles
                className="h-10 w-10 animate-pulse text-yellow-400 drop-shadow-sm"
                fill="currentColor"
              />
            </div>
            <div className="absolute -bottom-2 -left-2">
              <Sparkles
                className="h-6 w-6 animate-bounce text-yellow-400 drop-shadow-sm delay-150"
                fill="currentColor"
              />
            </div>
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-gray-900">
            {successMessage[locale]}
          </h2>
          <p className="mb-8 text-lg font-medium text-gray-600">
            {uploadSecurelyTransferred[locale]}
          </p>
          <button
            onClick={resetToForm}
            className="flex transform items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-base font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl focus:ring-4 focus:ring-blue-500/30"
          >
            <LucideImageIcon className="h-5 w-5" />
            {submitMoreButton[locale]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
        <p className="mt-2 text-base text-gray-500">{pageDescription[locale]}</p>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-8">
        {errorMessage !== '' && (
          <div className="flex items-center gap-4 rounded-xl border border-red-100 bg-red-50 p-4 text-red-800">
            <LucideImageIcon className="h-6 w-6 flex-shrink-0 opacity-80" />
            <p className="text-sm font-medium">{errorMessage}</p>
          </div>
        )}

        {/* Selected Files List - Rendered FIRST as requested */}
        {selectedFiles.length > 0 && (
          <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <label className="block text-lg font-semibold text-gray-800">
              {selectedImages[locale]} ({selectedFiles.length})
            </label>
            {selectedFiles.map((fileItem, index) => (
              <div key={fileItem.file.name} className="group">
                <div className="mb-4">
                  <FilePreviewList
                    files={[fileItem.file]}
                    onRemoveFile={() => removeFile(index)}
                    {...(fileItem.error ? { errorMessage: fileItem.error } : {})}
                  />
                </div>
                {/* Only show description input if there is no error on the file */}
                {!fileItem.error && (
                  <div className="pl-14">
                    <DescriptionInput
                      value={fileDescriptions[fileItem.file.name] || ''}
                      onChange={(desc) => handleDescriptionChange(fileItem.file.name, desc)}
                    />
                    {fileItem.descriptionError && (
                      <p className="mt-1 text-sm text-red-600">{fileItem.descriptionError}</p>
                    )}
                  </div>
                )}
                {index < selectedFiles.length - 1 && <hr className="my-6 border-gray-100" />}
              </div>
            ))}
          </div>
        )}

        {/* Upload Zone - Turns into 'Add more' area if files exist */}
        <div className="space-y-6">
          <FileUploadZone onFileSelect={handleFileSelect} />
        </div>

        <hr className="border-gray-200" />
        <ConfirmationCheckboxes
          rightsTransferred={rightsTransferred}
          onRightsChange={setRightsTransferred}
        />
        <hr className="border-gray-200" />
        <SubmitButton
          isDisabled={isSubmitDisabled}
          fileCount={selectedFiles.filter((f) => !f.error).length}
          isLoading={isUploading}
        />
      </form>
    </div>
  );
};

export default ImageUploadPage;
