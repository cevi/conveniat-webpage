'use client';

import { cn } from '@/utils/tailwindcss-override';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import * as React from 'react';

import { buttonVariants } from '@/components/ui/buttons/button';

const ChatAlertDialog = AlertDialogPrimitive.Root;

const ChatAlertDialogTrigger = AlertDialogPrimitive.Trigger;

const ChatAlertDialogPortal = AlertDialogPrimitive.Portal;

const ChatAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, reference) => (
  <AlertDialogPrimitive.Overlay
    ref={reference}
    className={cn(
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[2147483647] bg-black/20 backdrop-blur-sm',
      className,
    )}
    {...props}
  />
));
ChatAlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const ChatAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, reference) => (
  <ChatAlertDialogPortal>
    <ChatAlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={reference}
      className={cn(
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-[2147483647] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl duration-200',
        className,
      )}
      {...props}
    />
  </ChatAlertDialogPortal>
));
ChatAlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const ChatAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
);
ChatAlertDialogHeader.displayName = 'ChatAlertDialogHeader';

const ChatAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)}
    {...props}
  />
);
ChatAlertDialogFooter.displayName = 'ChatAlertDialogFooter';

const ChatAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, reference) => (
  <AlertDialogPrimitive.Title
    ref={reference}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
));
ChatAlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const ChatAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, reference) => (
  <AlertDialogPrimitive.Description
    ref={reference}
    className={cn('text-muted-foreground text-sm', className)}
    {...props}
  />
));
ChatAlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

const ChatAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, reference) => (
  <AlertDialogPrimitive.Action
    ref={reference}
    className={cn(buttonVariants(), className)}
    {...props}
  />
));
ChatAlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const ChatAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, reference) => (
  <AlertDialogPrimitive.Cancel
    ref={reference}
    className={cn(buttonVariants({ variant: 'outline' }), 'mt-2 sm:mt-0', className)}
    {...props}
  />
));
ChatAlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
  ChatAlertDialog,
  ChatAlertDialogAction,
  ChatAlertDialogCancel,
  ChatAlertDialogContent,
  ChatAlertDialogDescription,
  ChatAlertDialogFooter,
  ChatAlertDialogHeader,
  ChatAlertDialogOverlay,
  ChatAlertDialogPortal,
  ChatAlertDialogTitle,
  ChatAlertDialogTrigger,
};
