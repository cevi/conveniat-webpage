import { getImageAltInLocale } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Image as ImagePayloadDocumentType } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import Image from 'next/image';
import React, { Suspense, useEffect, useState } from 'react'; // Import useEffect

interface AnnotationImagesSectionProperties {
  images: ImagePayloadDocumentType[];
  locale: Locale;
}

export const AnnotationImagesSection: React.FC<AnnotationImagesSectionProperties> = ({
  images,
  locale,
}) => {
  const [selectedImage, setSelectedImage] = useState<ImagePayloadDocumentType | undefined>();

  useEffect(() => {
    document.body.style.overflow = selectedImage ? 'hidden' : '';
    return (): void => {
      document.body.style.overflow = '';
    };
  }, [selectedImage]);

  if (images.length === 0) {
    return <></>;
  }

  return (
    <div className="border-b-2 border-gray-100 p-4">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((image, index) => (
          <Suspense key={index} fallback={<div className="h-24 w-24 rounded-lg bg-gray-200" />}>
            <Image
              src={image.url ?? ''}
              alt={getImageAltInLocale(locale, image)}
              width={96}
              height={96}
              className="h-24 w-24 cursor-pointer rounded-lg object-cover"
              onClick={() => setSelectedImage(image)}
            />
          </Suspense>
        ))}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(undefined)}
        >
          <div
            className="bg-opacity-50 absolute inset-0 bg-black"
            style={{ backdropFilter: 'blur(8px)' }}
          ></div>

          <div
            className="relative z-10 max-h-full max-w-full"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 z-20 text-3xl font-bold text-white"
              onClick={() => setSelectedImage(undefined)}
            >
              &times;
            </button>
            <Image
              src={selectedImage.url ?? ''}
              alt={getImageAltInLocale(locale, selectedImage)}
              layout="intrinsic"
              width={1000}
              height={800}
              objectFit="contain"
              className="max-h-screen max-w-screen"
            />
          </div>
        </div>
      )}
    </div>
  );
};
