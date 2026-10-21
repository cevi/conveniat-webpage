'use client';

import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useCurrentLocale } from 'next-i18n-router/client';
import * as React from 'react';

const closeLabel: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

const ChatDialog = DialogPrimitive.Root;

const ChatDialogTrigger = DialogPrimitive.Trigger;

const ChatDialogPortal = DialogPrimitive.Portal;

const ChatDialogClose = DialogPrimitive.Close;

const ChatDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, reference) => (
  <DialogPrimitive.Overlay
    ref={reference}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[99999] cursor-pointer bg-black/20 backdrop-blur-sm',
      className,
    )}
    {...props}
  />
));
ChatDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ChatDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, reference) => {
  const locale = useCurrentLocale(i18nConfig) as Locale;
  return (
    <ChatDialogPortal>
      <ChatDialogOverlay />
      <DialogPrimitive.Content
        ref={reference}
        className={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 border-line fixed top-[50%] left-[50%] z-[99999] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-[14px] border bg-white p-6 shadow-xl duration-200',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel[locale]}
          className="hover:bg-quiet absolute top-2 right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-green-700 disabled:pointer-events-none"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </ChatDialogPortal>
  );
});
ChatDialogContent.displayName = DialogPrimitive.Content.displayName;

const ChatDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
);
ChatDialogHeader.displayName = 'ChatDialogHeader';

const ChatDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
ChatDialogFooter.displayName = 'ChatDialogFooter';

const ChatDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, reference) => (
  <DialogPrimitive.Title
    ref={reference}
    className={cn('font-heading text-heading text-lg leading-tight font-bold', className)}
    {...props}
  />
));
ChatDialogTitle.displayName = DialogPrimitive.Title.displayName;

const ChatDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, reference) => (
  <DialogPrimitive.Description
    ref={reference}
    className={cn('text-[15px] text-green-700', className)}
    {...props}
  />
));
ChatDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  ChatDialog,
  ChatDialogClose,
  ChatDialogContent,
  ChatDialogDescription,
  ChatDialogFooter,
  ChatDialogHeader,
  ChatDialogOverlay,
  ChatDialogPortal,
  ChatDialogTitle,
  ChatDialogTrigger,
};
