'use client';

import { HeadlineH1 } from '@/components/ui/typography/headline-h1';
import { ConfirmationCheckboxes } from '@/features/image-submission/confirmation-checkboxes';
import { DescriptionInput } from '@/features/image-submission/description-input';
import { FilePreviewList } from '@/features/image-submission/file-preview-list';
import { FileUploadZone } from '@/features/image-submission/file-upload-zone';
import { SubmitButton } from '@/features/image-submission/submit-button';
import { uploadUserImage } from '@/features/payload-cms/components/user-upload/upload-user-image';
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
  en: 'Your uploaded image is too small',
  de: 'Dein Bild ist zu klein',
  fr: 'Votre image téléchargée est trop petite',
};

const ImageUploadPage: React.FC = () => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [userDescription, setUserDescription] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [rightsTransferred, setRightsTransferred] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessView, setShowSuccessView] = useState(false);

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
          isValid: (await checkImageDimensions(file)) && file.size < 10 * 1024 * 1024,
        })),
      );

      const validFiles = results.filter((r) => r.isValid).map((r) => r.file);
      const nonValid = results.some((r) => !r.isValid);
      if (nonValid) setErrorMessage(imageSizeTooSmall[locale]);

      setSelectedFiles((previous) => [...previous, ...validFiles]);
    })();
  };

  const removeFile = (index: number): void => {
    setSelectedFiles((previous) => previous.filter((_, index_) => index_ !== index));
  };

  const clearForm = (): void => {
    setSelectedFiles([]);
    setUserDescription('');
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

    if (userDescription.trim() === '') {
      setErrorMessage(descriptionRequired[locale]);
      return;
    }

    if (!privacyAccepted || !rightsTransferred) {
      setErrorMessage(confirmationsRequired[locale]);
      return;
    }

    setIsLoading(true);

    try {
      await Promise.all(
        selectedFiles.map(async (file) => {
          const response = await uploadUserImage(file, userDescription.trim());
          if (response.error) {
            setErrorMessage(`${uploadError[locale]}: ${response.message}`);
          }
        }),
      );
      if (!errorMessage) {
        setShowSuccessView(true);
      }
    } catch (error) {
      setErrorMessage(
        `${uploadError[locale]}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isSubmitDisabled =
    selectedFiles.length === 0 ||
    userDescription.trim() === '' ||
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
          <FilePreviewList files={selectedFiles} onRemoveFile={removeFile} />
          {selectedFiles.length > 0 && <hr className="border-gray-200" />}
          <DescriptionInput value={userDescription} onChange={setUserDescription} />
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
            isLoading={isLoading}
          />
        </form>
      </div>
    </div>
  );
};

export default ImageUploadPage;
