/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';

const closeText: StaticTranslationString = {
  de: 'Bild schliessen',
  en: 'Close image',
  fr: "Fermer l'image",
};

interface ImageViewerProperties {
  src: string;
  alt: string;
  caption?: string | undefined;
  /** shown at its own size when `src` cannot be loaded, e.g. offline */
  fallbackSrc?: string | undefined;
  locale: Locale;
  onClose: () => void;
}

/**
 * A chat image across the whole screen, on the app's page surface. A tap anywhere, the close
 * button or Escape closes it.
 */
export const ImageViewer: React.FC<ImageViewerProperties> = ({
  src,
  alt,
  caption,
  fallbackSrc,
  locale,
  onClose,
}) => {
  const [hasFailed, setHasFailed] = useState(false);
  const showsFallback = hasFailed && fallbackSrc !== undefined;
  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 bg-page fixed inset-0 z-[99999]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // React bubbles through the portal into the chat bubble, whose press selects the message
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-3 p-4 pt-[max(3.5rem,var(--status-bar-height))] pb-[max(1rem,env(safe-area-inset-bottom))] focus:outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          {showsFallback ? (
            // a small picture stays its size instead of being stretched across the screen
            <img src={fallbackSrc} alt={alt} className="max-h-full max-w-full object-contain" />
          ) : (
            <img
              src={src}
              alt={alt}
              onError={() => setHasFailed(true)}
              className="min-h-0 max-w-full flex-1 object-contain"
            />
          )}
          {caption !== undefined && caption !== '' && (
            <p className="font-body text-center text-[15px] text-green-700">{caption}</p>
          )}
          <DialogPrimitive.Close asChild>
            <Button
              variant="quiet"
              size="touchIcon"
              aria-label={closeText[locale]}
              className="absolute top-[max(0.75rem,var(--status-bar-height))] right-3"
            >
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};
