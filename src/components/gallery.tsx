import {
  Carousel,
  CarouselContent,
  CarouselDescription,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/carousel';
import Image from 'next/image';
import React from 'react';

export interface PhotoCarouselBlock {
  images: {
    sizes?: { large?: { url: string } };
    alt: string;
    imageCaption?: string;
  }[];
}

export const PhotoCarousel: React.FC<PhotoCarouselBlock> = async ({ images }) => {
  const length = images.length;

  if (length === 0) {
    throw new Error('No images provided');
  }

  // If there are less than 4 images, duplicate the images to fill the carousel
  if (length < 4) {
    const diff = 4 - length;
    for (let index = 0; index < diff; index++) {
      const img = images[index % length];
      if (img === undefined) continue;
      images.push(img);
    }
  }

  return (
    <div className="mx-[-32px] mb-8 w-screen select-none max-lg:overflow-hidden md:mx-0 md:w-full">
      <Carousel
        opts={{ align: 'center', loop: true }}
        className="w-full max-lg:w-[200%] max-lg:translate-x-[-25%] max-lg:transform"
      >
        <CarouselContent>
          {Array.from({ length }).map((_, index) => (
            <CarouselItem key={index} index={index} className="basis-1/3 lg:basis-1/2">
              <div className="p-1">
                <Image
                  className="h-[240px] rounded-md bg-white object-cover max-md:aspect-square xl:h-[400px]"
                  src={images[index % images.length]?.sizes?.large?.url ?? ''}
                  alt={images[index % images.length]?.alt ?? ''}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII="
                  width={600}
                  height={200}
                />
              </div>
              <CarouselDescription index={index} className="flex flex-col">
                {images[index % images.length]?.imageCaption}
                <span className="mt-2">
                  {index + 1} / {length}
                </span>
              </CarouselDescription>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="max-lg:hidden" />
        <CarouselNext className="max-lg:hidden" />
      </Carousel>
    </div>
  );
};
