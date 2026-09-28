/* eslint-disable @next/next/no-img-element */
'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type React from 'react';

const closeText: StaticTranslationString = {
  de: 'Bild schliessen',
  en: 'Close image',
  fr: "Fermer l'image",
};

interface ImageViewerProperties {
  src: string;
  alt: string;
  caption?: string | undefined;
  locale: Locale;
  onClose: () => void;
}

/**
 * A chat image across the whole screen, on black. A tap anywhere, the close button or Escape
 * closes it.
 */
export const ImageViewer: React.FC<ImageViewerProperties> = ({
  src,
  alt,
  caption,
  locale,
  onClose,
}) => (
  <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-[99999] bg-gray-950" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        // React bubbles through the portal into the chat bubble, whose press selects the message
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-3 p-4 pt-[max(3.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] focus:outline-none"
      >
        <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
        <img src={src} alt={alt} className="min-h-0 max-w-full flex-1 object-contain" />
        {caption !== undefined && caption !== '' && (
          <p className="font-body text-center text-sm text-white/80">{caption}</p>
        )}
        <DialogPrimitive.Close
          aria-label={closeText[locale]}
          className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <X className="h-6 w-6" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);
