'use client';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Card } from '@/components/ui/card';
import { SectionLabel } from '@/components/ui/section-label';
import { DescriptionInput } from '@/features/image-submission/description-input';
import { FilePreviewList } from '@/features/image-submission/file-preview-list';
import { FileUploadZone } from '@/features/image-submission/file-upload-zone';
import {
  isLargeEnough,
  MIN_IMAGE_LONG_SIDE,
  MIN_IMAGE_SHORT_SIDE,
} from '@/features/image-submission/image-requirements';
import { OwnImagesSection } from '@/features/image-submission/own-images-section';
import { SubmitButton } from '@/features/image-submission/submit-button';
import { TermsText } from '@/features/image-submission/terms-text';
import { USER_IMAGE_MAX_BYTES } from '@/features/payload-cms/constants/user-image-upload';
import { useUserUpload } from '@/features/payload-cms/hooks/use-user-upload';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, ShieldCheck } from 'lucide-react';
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

const goodPhotos: StaticTranslationString = {
  en: 'Good photos',
  de: 'Gute Fotos',
  fr: 'De bonnes photos',
};

const termsApply: StaticTranslationString = {
  en: 'The terms you agreed to apply.',
  de: 'Es gelten die Bedingungen, denen du zugestimmt hast.',
  fr: 'Les conditions que tu as acceptées s’appliquent.',
};

const showTerms: StaticTranslationString = {
  en: 'Show',
  de: 'Ansehen',
  fr: 'Voir',
};

const termsTitle: StaticTranslationString = {
  en: 'Terms',
  de: 'Bedingungen',
  fr: 'Conditions',
};

const MINIMUM = `${MIN_IMAGE_LONG_SIDE} × ${MIN_IMAGE_SHORT_SIDE} px`;

/** Says what is wrong with a photo that is too small, and what to choose instead. */
const tooSmall = (locale: Locale, width: number, height: number): string => {
  const current = `${width} × ${height} px`;
  const messages: StaticTranslationString = {
    de: `Zu klein: ${current}, nötig sind mindestens ${MINIMUM}. Wähle das Originalfoto aus deiner Galerie, nicht einen Screenshot oder eine weitergeleitete Kopie.`,
    en: `Too small: ${current}, at least ${MINIMUM} is needed. Choose the original photo from your gallery, not a screenshot or a forwarded copy.`,
    fr: `Trop petite : ${current}, il faut au moins ${MINIMUM}. Choisis la photo originale de ta galerie, pas une capture d'écran ni une copie transférée.`,
  };
  return messages[locale];
};

interface FileItem {
  file: File;
  error?: string;
  descriptionError?: string;
}

const readImageSize = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      const img = new Image();
      img.addEventListener('load', () => {
        resolve({ width: img.width, height: img.height });
      });
      img.src = event.target?.result as string;
    });
    reader.readAsDataURL(file);
  });
};

/**
 * Choosing, describing and uploading the images. The terms were agreed to before, so the upload
 * starts as soon as every image has its description.
 */
export const UploadForm: React.FC<{
  photoTips: string[];
  termsFullText: string;
  onUploaded: () => void;
}> = ({ photoTips, termsFullText, onUploaded }) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [fileDescriptions, setFileDescriptions] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [termsOpen, setTermsOpen] = useState(false);

  const { uploadImage, isUploading } = useUserUpload();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;
    if (!files) return;

    setErrorMessage('');

    const newFiles = [...files].filter((file) => file.type.startsWith('image/'));

    void (async (): Promise<void> => {
      const newFileItems: FileItem[] = await Promise.all(
        newFiles.map(async (file) => {
          const { width, height } = await readImageSize(file);
          let error: string | undefined;

          if (!isLargeEnough(width, height)) {
            error = tooSmall(locale, width, height);
          } else if (file.size > USER_IMAGE_MAX_BYTES) {
            error = imageTooBig[locale];
          }

          return error ? { file, error } : { file };
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

  const upload = async (): Promise<void> => {
    const validFiles = selectedFiles.filter((item) => !item.error);

    try {
      const results = await Promise.all(
        validFiles.map(async (item) => {
          const description = fileDescriptions[item.file.name]?.trim() ?? '';
          const response = await uploadImage(item.file, description);
          return { file: item.file, response };
        }),
      );

      const failedUploads = results.filter((r) => r.response.error);
      if (failedUploads.length < results.length) {
        // "Meine Bilder" lists what was just accepted
        void queryClient.invalidateQueries(trpc.upload.getOwnSubmittedImageList.queryFilter());
      }

      if (failedUploads.length === 0) {
        onUploaded();
        return;
      }

      // An uploaded image leaves the list, so trying the rest again does not hand it in twice.
      // By file, not by name: two photos picked together may share one.
      const uploadedFiles = new Set(results.filter((r) => !r.response.error).map((r) => r.file));
      // A failure that says nothing about the image stays out of its error, which would
      // keep it out of every later attempt; it is shown above the form instead.
      const retryable = failedUploads.find((f) => f.response.isRetryable);
      if (retryable) setErrorMessage(retryable.response.message);

      setSelectedFiles((previous) =>
        previous
          .filter((item) => !uploadedFiles.has(item.file))
          .map((item) => {
            const failure = failedUploads.find(
              (f) => f.file === item.file && !f.response.isRetryable,
            );
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
    } catch (error) {
      setErrorMessage(
        `${uploadError[locale]}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
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

      return descriptionError ? { ...item, descriptionError } : { file: item.file };
    });

    if (filesWithValidation.some((item) => !!item.descriptionError)) {
      setSelectedFiles(filesWithValidation);
      return;
    }

    void upload();
  };

  const isSubmitDisabled = selectedFiles.filter((f) => !f.error).length === 0;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {errorMessage !== '' && (
        <div
          role="alert"
          className="border-danger-line bg-danger-soft text-danger-text flex items-center gap-3 rounded-[14px] border p-4"
        >
          <AlertCircle className="text-danger h-5 w-5 shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{errorMessage}</p>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <section className="space-y-3">
          <SectionLabel className="px-1">
            {selectedImages[locale]} ({selectedFiles.length})
          </SectionLabel>
          {selectedFiles.map((fileItem, index) => (
            <Card key={fileItem.file.name}>
              <FilePreviewList
                files={[fileItem.file]}
                onRemoveFile={() => removeFile(index)}
                {...(fileItem.error ? { errorMessage: fileItem.error } : {})}
              />
              {/* Only show description input if there is no error on the file */}
              {!fileItem.error && (
                <div className="px-4 pb-4">
                  <DescriptionInput
                    value={fileDescriptions[fileItem.file.name] || ''}
                    onChange={(desc) => handleDescriptionChange(fileItem.file.name, desc)}
                  />
                  {fileItem.descriptionError && (
                    <p className="text-danger-text mt-2 text-[13px] font-semibold">
                      {fileItem.descriptionError}
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </section>
      )}

      {/* Upload Zone - Turns into 'Add more' area if files exist */}
      <FileUploadZone onFileSelect={handleFileSelect} compact={selectedFiles.length > 0} />

      {selectedFiles.length === 0 && photoTips.length > 0 && (
        <section className="space-y-3">
          <SectionLabel className="px-1">{goodPhotos[locale]}</SectionLabel>
          <Card as="ul" divided>
            {photoTips.map((tip, index) => (
              <li key={index} className="px-4 py-3 text-[15px] leading-normal text-green-700">
                {tip}
              </li>
            ))}
          </Card>
        </section>
      )}

      <div className="bg-quiet flex items-center gap-3 rounded-[14px] py-1 pr-1 pl-4 text-[13px] text-green-700">
        <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span className="flex-1">{termsApply[locale]}</span>
        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          className="focus-visible:focus-surface min-h-11 shrink-0 cursor-pointer rounded-xl px-3 font-semibold text-green-900 underline underline-offset-2"
        >
          {showTerms[locale]}
        </button>
      </div>

      {selectedFiles.length === 0 && <OwnImagesSection />}

      <div
        className={cn(
          selectedFiles.length > 0 &&
            'pointer-events-none fixed right-0 bottom-[76px] left-0 z-40 p-4 md:static md:p-0',
        )}
      >
        <div className="pointer-events-auto mx-auto max-w-2xl">
          <SubmitButton
            isDisabled={isSubmitDisabled}
            fileCount={selectedFiles.filter((f) => !f.error).length}
            isLoading={isUploading}
          />
        </div>
      </div>
      {/* Spacer for sticky button on mobile */}
      {selectedFiles.length > 0 && <div className="h-24 md:hidden" />}

      <BottomSheet open={termsOpen} onOpenChange={setTermsOpen} title={termsTitle[locale]}>
        <TermsText text={termsFullText} />
      </BottomSheet>
    </form>
  );
};
