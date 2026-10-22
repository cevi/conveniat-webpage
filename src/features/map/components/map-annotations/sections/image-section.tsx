'use client';

import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Image as ImagePayloadDocumentType } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Image from 'next/image';
import type React from 'react';
import { useState } from 'react';

const closeText: StaticTranslationString = {
  de: 'Bild schliessen',
  en: 'Close image',
  fr: "Fermer l'image",
};

const openText: StaticTranslationString = {
  de: 'Bild öffnen: {{alt}}',
  en: 'Open image: {{alt}}',
  fr: "Ouvrir l'image : {{alt}}",
};

interface AnnotationImagesSectionProperties {
  images: ImagePayloadDocumentType[];
  locale: Locale;
}

/**
 * The pictures of a place as a row of thumbnails that scrolls sideways; a tap opens one across
 * the whole screen, which a tap anywhere, its ✕ or Escape closes again.
 */
export const AnnotationImagesSection: React.FC<AnnotationImagesSectionProperties> = ({
  images,
  locale,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImagePayloadDocumentType | undefined>();

  if (images.length === 0) {
    return <></>;
  }

  return (
    <section className="pt-1 pb-3">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => setSelectedImage(image)}
            aria-label={openText[locale].replace('{{alt}}', getImageAltInLocale(locale, image))}
            className="focus-visible:focus-ring-inset h-24 w-24 shrink-0 cursor-pointer overflow-hidden rounded-[10px]"
          >
            <Image
              src={image.url ?? ''}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <DialogPrimitive.Root
        open={selectedImage !== undefined}
        onOpenChange={(open) => !open && setSelectedImage(undefined)}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[1000] bg-green-900/90" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onClick={() => setSelectedImage(undefined)}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pt-[max(3.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] focus:outline-none"
          >
            {selectedImage !== undefined && (
              <>
                <DialogPrimitive.Title className="sr-only">
                  {getImageAltInLocale(locale, selectedImage)}
                </DialogPrimitive.Title>
                <Image
                  src={selectedImage.url ?? ''}
                  alt={getImageAltInLocale(locale, selectedImage)}
                  width={1000}
                  height={800}
                  className="max-h-full w-auto max-w-full object-contain"
                />
              </>
            )}
            <DialogPrimitive.Close
              aria-label={closeText[locale]}
              className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-white"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </section>
  );
};
