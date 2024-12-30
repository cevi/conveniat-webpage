import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Image from 'next/image';
import { ErrorBoundary } from 'react-error-boundary';

const images = [
  '/imgs/Konekta_5-min.jpg',
  '/imgs/Konekta_23-min.jpg',
  '/imgs/Konekta_22-min.jpg',
  '/imgs/Konekta_29-min.jpg',
  '/imgs/Konekta_14-min.jpg',
];

export const Gallery: React.FC = () => {
  const length = images.length;

  // If there are less than 4 images, duplicate the images to fill the carousel
  if (length < 4) {
    const diff = 4 - length;
    for (let index = 0; index < diff; index++) {
      images.push(images[index % length] as string);
    }
  }

  return (
    <ErrorBoundary fallback={<></>}>
      <div className="w-full select-none max-lg:overflow-hidden">
        <Carousel
          opts={{ align: 'center', loop: true }}
          className="w-full max-lg:w-[200%] max-lg:translate-x-[-25%] max-lg:transform"
        >
          <CarouselContent>
            {Array.from({ length: 4 }).map((_, index) => (
              <CarouselItem key={index} className="basis-1/3 lg:basis-1/2">
                <div className="p-1">
                  <Image
                    className="rounded-md"
                    src={images[index % images.length] as string}
                    alt="Konekta 2024"
                    width={1200}
                    height={800}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="max-lg:hidden" />
          <CarouselNext className="max-lg:hidden" />
        </Carousel>
      </div>
    </ErrorBoundary>
  );
};
