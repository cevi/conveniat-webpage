import {
  Carousel,
  CarouselContent,
  CarouselDescription,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/carousel';
import type { SimplifiedImageType } from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import {
  getImageAltInLocale,
  getImageCaptionInLocale,
  getRelativeImageUrl,
} from '@/features/payload-cms/payload-cms/utils/images-meta-fields';
import type { Locale } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import Image from 'next/image';
import React from 'react';

/**
 * The aspect ratios a photo carousel can be rendered in.
 *
 * On small screens the carousel viewport is twice as wide as the screen (see
 * `max-lg:w-[200%]` below), so a slide basis of `x%` renders at `2x%` of the
 * screen. The `+24px` compensates for the slide gutter (`pl-4`) and the inner
 * padding (`p-1`), which are part of the basis but not of the image itself.
 *
 * Portrait ratios keep a narrower basis on larger screens (where the carousel
 * is only as wide as the content column), but on mobile they take at least 80%
 * of the screen width so the image stays readable.
 */
const carouselAspectRatios = {
  video: {
    imageClassName: 'aspect-video',
    slideClassName: 'basis-1/3 lg:basis-1/2',
    dimensions: { width: 1200, height: 675 },
  },
  '3/2': {
    imageClassName: 'aspect-[3/2]',
    slideClassName: 'basis-1/3 lg:basis-1/2',
    dimensions: { width: 1200, height: 800 },
  },
  '4/3': {
    imageClassName: 'aspect-[4/3]',
    slideClassName: 'basis-1/3 lg:basis-1/2',
    dimensions: { width: 1200, height: 900 },
  },
  '1/1': {
    imageClassName: 'aspect-square',
    slideClassName: 'basis-1/3 lg:basis-1/3',
    dimensions: { width: 1200, height: 1200 },
  },
  '3/4': {
    imageClassName: 'aspect-[3/4]',
    slideClassName: 'basis-[calc(40%+24px)] md:basis-1/4',
    dimensions: { width: 900, height: 1200 },
  },
  '2/3': {
    imageClassName: 'aspect-[2/3]',
    slideClassName: 'basis-[calc(40%+24px)] md:basis-1/4',
    dimensions: { width: 800, height: 1200 },
  },
  '9/16': {
    imageClassName: 'aspect-[9/16]',
    slideClassName: 'basis-[calc(40%+24px)] md:basis-1/4',
    dimensions: { width: 675, height: 1200 },
  },
} as const;

export type CarouselAspectRatio = keyof typeof carouselAspectRatios;

const defaultAspectRatio: CarouselAspectRatio = '3/2';

export interface PhotoCarouselBlock {
  images: {
    sizes?: { large?: { url: string } };
    alt_de: string;
    alt_en: string;
    alt_fr: string;
    imageCaption_de?: string;
    imageCaption_en?: string;
    imageCaption_fr?: string;
  }[];
  aspectRatio?: string | null | undefined;
  locale: Locale;
}

const blurDataURL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

const isCarouselAspectRatio = (ratio: string | null | undefined): ratio is CarouselAspectRatio =>
  ratio !== undefined && ratio !== null && ratio in carouselAspectRatios;

export const PhotoCarousel: React.FC<PhotoCarouselBlock> = ({ images, aspectRatio, locale }) => {
  const length = images.length;

  if (length === 0) {
    throw new Error('No images provided');
  }

  const { imageClassName, slideClassName, dimensions } =
    carouselAspectRatios[isCarouselAspectRatio(aspectRatio) ? aspectRatio : defaultAspectRatio];

  return (
    <div className="mx-[-32px] mb-8 w-screen select-none max-lg:overflow-hidden md:mx-0 md:w-full">
      <Carousel
        opts={{ align: 'center', loop: true }}
        className="w-full max-lg:w-[200%] max-lg:translate-x-[-25%] max-lg:transform"
      >
        {/* the arrows are positioned relative to the images, not the descriptions */}
        <div className="relative">
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index} index={index} className={slideClassName}>
                <div className="p-1">
                  <Image
                    className={cn('w-full rounded-md bg-white object-cover', imageClassName)}
                    src={getRelativeImageUrl(image.sizes?.large?.url)}
                    alt={getImageAltInLocale(locale, image as SimplifiedImageType)}
                    placeholder="blur"
                    blurDataURL={blurDataURL}
                    width={dimensions.width}
                    height={dimensions.height}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="max-lg:hidden" />
          <CarouselNext className="max-lg:hidden" />
        </div>

        {/* all descriptions are stacked on top of each other, only the active one is visible */}
        <div className="mx-auto grid max-lg:w-1/2">
          {images.map((image, index) => (
            <CarouselDescription
              key={index}
              index={index}
              className="col-start-1 row-start-1 flex flex-col"
            >
              {getImageCaptionInLocale(locale, image)}
              <span className="mt-2">
                {index + 1} / {length}
              </span>
            </CarouselDescription>
          ))}
        </div>
      </Carousel>
    </div>
  );
};
