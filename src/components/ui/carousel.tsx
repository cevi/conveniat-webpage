'use client';

import * as React from 'react';
import { useEffect } from 'react';
import useEmblaCarousel, { type UseEmblaCarouselType } from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { cn } from '@/utils/tailwindcss-override';
import { Button } from '@/components/ui/button';

type CarouselApi = UseEmblaCarouselType[1];
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>;
type CarouselOptions = UseCarouselParameters[0];
type CarouselPlugin = UseCarouselParameters[1];

type CarouselProperties = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: 'horizontal' | 'vertical';
  setApi?: (api: CarouselApi) => void;
};

type CarouselContextProperties = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0];
  api: ReturnType<typeof useEmblaCarousel>[1];
  scrollPrev: () => void;
  scrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
} & CarouselProperties;

const CarouselContext = React.createContext<CarouselContextProperties | undefined>(undefined);

const useCarousel = (): CarouselContextProperties & { current: number; size: number } => {
  const context = React.useContext(CarouselContext);

  if (context === undefined) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }
  const { api } = context;

  const [current, setCurrent] = React.useState(0);
  const [size, setSize] = React.useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });

    setSize(api.slideNodes().length);
  }, [api]);

  return { ...context, current, size };
};

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProperties
>(
  (
    { orientation = 'horizontal', opts, setApi, plugins, className, children, ...properties },
    reference,
  ) => {
    const [carouselReference, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === 'horizontal' ? 'x' : 'y',
      },
      plugins,
    );
    const [canScrollPrevious, setCanScrollPrevious] = React.useState(false);
    const [canScrollNext, setCanScrollNext] = React.useState(false);

    const onSelect = React.useCallback((_api: CarouselApi) => {
      if (!_api) {
        return;
      }

      setCanScrollPrevious(_api.canScrollPrev());
      setCanScrollNext(_api.canScrollNext());
    }, []);

    const scrollPrevious = React.useCallback(() => {
      api?.scrollPrev();
    }, [api]);

    const scrollNext = React.useCallback(() => {
      api?.scrollNext();
    }, [api]);

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          scrollPrevious();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          scrollNext();
        }
      },
      [scrollPrevious, scrollNext],
    );

    React.useEffect(() => {
      if (!api || !setApi) {
        return;
      }

      setApi(api);
    }, [api, setApi]);

    React.useEffect(() => {
      if (!api) {
        return;
      }

      onSelect(api);
      api.on('reInit', onSelect);
      api.on('select', onSelect);

      return (): void => {
        api.off('select', onSelect);
      };
    }, [api, onSelect]);

    return (
      <>
        <CarouselContext.Provider
          value={{
            carouselRef: carouselReference,
            api: api,
            opts,
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            orientation: orientation ?? (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
            scrollPrev: scrollPrevious,
            scrollNext,
            canScrollPrev: canScrollPrevious,
            canScrollNext,
          }}
        >
          <div
            ref={reference}
            onKeyDownCapture={handleKeyDown}
            className={cn('relative', className)}
            role="region"
            aria-roledescription="carousel"
            {...properties}
          >
            {children}
          </div>
        </CarouselContext.Provider>
      </>
    );
  },
);
Carousel.displayName = 'Carousel';

const CarouselContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...properties }, reference) => {
    const { carouselRef, orientation } = useCarousel();

    return (
      <div ref={carouselRef} className="overflow-hidden">
        <div
          ref={reference}
          className={cn(
            'flex',
            orientation === 'horizontal' ? '-ml-4' : '-mt-4 flex-col',
            className,
          )}
          {...properties}
        />
      </div>
    );
  },
);
CarouselContent.displayName = 'CarouselContent';

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { index: number }
>(({ index, className, ...properties }, reference) => {
  const { size: maxIndex, current, orientation, scrollPrev, scrollNext } = useCarousel();

  /**
   * Scroll to the previous or next slide based on the click position.
   */
  const onClick = (): void => {
    if (current - 1 === (index + 1) % maxIndex) {
      scrollPrev();
    } else if (current - 1 === (index - 1 + maxIndex) % maxIndex) {
      scrollNext();
    }
  };

  return (
    <div
      ref={reference}
      key={index}
      role="group"
      onClick={onClick}
      aria-roledescription="slide"
      className={cn(
        'min-w-0 shrink-0 grow-0 basis-full',
        orientation === 'horizontal' ? 'pl-4' : 'pt-4',
        className,
      )}
      {...properties}
    />
  );
});
CarouselItem.displayName = 'CarouselItem';

const CarouselPrevious = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = 'outline', size = 'icon', ...properties }, reference) => {
    const { orientation, scrollPrev, canScrollPrev } = useCarousel();

    return (
      <Button
        ref={reference}
        variant={variant}
        size={size}
        className={cn(
          'absolute h-8 w-8 rounded-full',
          orientation === 'horizontal'
            ? '-left-12 top-[140px] -translate-y-1/2'
            : '-top-12 left-1/2 -translate-x-1/2 rotate-90',
          className,
        )}
        disabled={!canScrollPrev}
        onClick={scrollPrev}
        {...properties}
      >
        <ArrowLeft className="h-4 w-4 text-conveniat-green" />
        <span className="sr-only">Previous slide</span>
      </Button>
    );
  },
);
CarouselPrevious.displayName = 'CarouselPrevious';

const CarouselNext = React.forwardRef<HTMLButtonElement, React.ComponentProps<typeof Button>>(
  ({ className, variant = 'outline', size = 'icon', ...properties }, reference) => {
    const { orientation, scrollNext, canScrollNext } = useCarousel();

    return (
      <Button
        ref={reference}
        variant={variant}
        size={size}
        className={cn(
          'absolute h-8 w-8 rounded-full',
          orientation === 'horizontal'
            ? '-right-12 top-[140px] -translate-y-1/2'
            : '-bottom-12 left-1/2 -translate-x-1/2 rotate-90',
          className,
        )}
        disabled={!canScrollNext}
        onClick={scrollNext}
        {...properties}
      >
        <ArrowRight className="h-4 w-4 text-conveniat-green" />
        <span className="sr-only">Next slide</span>
      </Button>
    );
  },
);
CarouselNext.displayName = 'CarouselNext';

const CarouselDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { index: number }
>(({ className, index, ...properties }, reference) => {
  const { current } = useCarousel();

  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    setIsVisible(current - 1 === index);
  }, [current, index]);

  return (
    <div
      ref={reference}
      className={cn(
        'mx-auto w-full text-balance py-2 text-center text-xs text-gray-300 transition-opacity duration-300 lg:max-w-[75%]',
        className,
      )}
      style={{ opacity: isVisible ? 1 : 0 }}
      {...properties}
    />
  );
});
CarouselDescription.displayName = 'CarouselDescription';

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  CarouselDescription,
};
