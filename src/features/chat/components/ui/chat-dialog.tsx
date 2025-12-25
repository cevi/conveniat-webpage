'use client';

import { cn } from '@/utils/tailwindcss-override';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import * as React from 'react';

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
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/20 backdrop-blur-sm',
      className,
    )}
    {...props}
  />
));
ChatDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const ChatDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, reference) => (
  <ChatDialogPortal>
    <ChatDialogOverlay />
    <DialogPrimitive.Content
      ref={reference}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl duration-200',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </ChatDialogPortal>
));
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
    className={cn('text-lg leading-none font-semibold tracking-tight', className)}
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
    className={cn('text-muted-foreground text-sm', className)}
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
