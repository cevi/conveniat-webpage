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
import { Image as LucideImageIcon } from 'lucide-react';
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

const submitMoreButton: StaticTranslationString = {
  en: 'Submit More Images',
  de: 'Weitere Bilder einreichen',
  fr: "Soumettre plus d'images",
};

const imageSizeTooSmall: StaticTranslationString = {
  en: 'Your uploaded image size is too small',
  de: 'Dein Bild hat eine zu geringe Auflösung',
  fr: 'Votre image téléchargée est trop petite',
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

const ImageUploadPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [rightsTransferred, setRightsTransferred] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessView, setShowSuccessView] = useState(false);

  const { uploadImage, isUploading } = useUserUpload();

  const checkImageDimensions = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', (event) => {
        const img = new Image();
        img.addEventListener('load', () => {
          resolve(
            (img.width >= 1920 && img.height >= 1080) || (img.height >= 1920 && img.width >= 1080),
          );
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
      const results = await Promise.all(
        newFiles.map(async (file) => ({
          file,
          isValidDimensions: await checkImageDimensions(file),
          isValidSize: file.size < 10 * 1024 * 1024,
        })),
      );

      const validFiles = results
        .filter((r) => r.isValidDimensions && r.isValidSize)
        .map((r) => r.file);

      const nonValidDimensions = results.some((r) => !r.isValidDimensions);
      if (nonValidDimensions) {
        setErrorMessage(imageSizeTooSmall[locale]);
      }

      const nonValidSize = results.some((r) => !r.isValidSize);
      if (nonValidSize) {
        setErrorMessage(imageTooBig[locale]);
      }

      setSelectedFiles((previous) => [...previous, ...validFiles]);
    })();
  };

  const removeFile = (index: number): void => {
    setSelectedFiles((previous) => {
      const fileToRemove = previous[index];
      setFileDescriptions((previous_) => {
        const updated = { ...previous_ };
        delete updated[fileToRemove?.name ?? ''];
        return updated;
      });
      return previous.filter((_, index_) => index_ !== index);
    });
  };

  const handleDescriptionChange = (fileName: string, description: string): void => {
    setFileDescriptions((previous) => ({ ...previous, [fileName]: description }));
  };

  const clearForm = (): void => {
    setSelectedFiles([]);
    setFileDescriptions({});
    setPrivacyAccepted(false);
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

    if (selectedFiles.length === 0) {
      setErrorMessage(selectAtLeastOne[locale]);
      return;
    }

    const missingDescriptions = selectedFiles.some(
      (file) => !fileDescriptions[file.name] || fileDescriptions[file.name]?.trim() === '',
    );

    if (missingDescriptions) {
      setErrorMessage(descriptionRequired[locale]);
      return;
    }

    const longDescriptions = selectedFiles.some(
      (file) => (fileDescriptions[file.name]?.trim().length ?? 0) > 1000,
    );

    if (longDescriptions) {
      setErrorMessage(descriptionTooLong[locale]);
      return;
    }

    if (!privacyAccepted || !rightsTransferred) {
      setErrorMessage(confirmationsRequired[locale]);
      return;
    }

    try {
      const uploadResults = await Promise.all(
        selectedFiles.map(async (file) => {
          const description = fileDescriptions[file.name]?.trim() ?? '';
          const response = await uploadImage(file, description);
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

  const isSubmitDisabled =
    selectedFiles.length === 0 ||
    Object.values(fileDescriptions).some((desc) => desc.trim() === '') ||
    !privacyAccepted ||
    !rightsTransferred;

  if (showSuccessView) {
    return (
      <div className="container mx-auto max-w-2xl px-4">
        <div className="border-b border-gray-200 px-6 py-4">
          <HeadlineH1>{successTitle[locale]}</HeadlineH1>
        </div>
        <div className="px-6 py-12 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="mb-4 text-xl font-semibold text-gray-900">{successMessage[locale]}</h2>
          <button
            onClick={resetToForm}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
          >
            {submitMoreButton[locale]}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <HeadlineH1>{pageTitle[locale]}</HeadlineH1>
        <p className="mt-1 text-sm text-gray-600">{pageDescription[locale]}</p>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
          {errorMessage !== '' && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <LucideImageIcon
                    className="h-10 w-10 text-red-800 opacity-65"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          <FileUploadZone onFileSelect={handleFileSelect} />
          {selectedFiles.map((file, index) => (
            <div key={file.name} className="mb-6">
              <FilePreviewList files={[file]} onRemoveFile={() => removeFile(index)} />
              <div className="mt-3">
                <DescriptionInput
                  value={fileDescriptions[file.name] || ''}
                  onChange={(desc) => handleDescriptionChange(file.name, desc)}
                />
              </div>
              <hr className="my-4 border-gray-200" />
            </div>
          ))}
          <hr className="border-gray-200" />
          <ConfirmationCheckboxes
            privacyAccepted={privacyAccepted}
            rightsTransferred={rightsTransferred}
            onPrivacyChange={setPrivacyAccepted}
            onRightsChange={setRightsTransferred}
          />
          <hr className="border-gray-200" />
          <SubmitButton
            isDisabled={isSubmitDisabled}
            fileCount={selectedFiles.length}
            isLoading={isUploading}
          />
        </form>
      </div>
    </div>
  );
};

export default ImageUploadPage;
