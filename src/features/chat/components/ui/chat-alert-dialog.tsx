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
      'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-[2147483647] bg-green-900/30',
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
        'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 border-line fixed top-[50%] left-[50%] z-[2147483647] grid w-[calc(100%-2rem)] max-w-lg translate-x-[-50%] translate-y-[-50%] gap-5 rounded-[16px] border bg-white p-5 shadow-xl duration-200',
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
  <div className={cn('flex flex-col gap-2 text-left', className)} {...props} />
);
ChatAlertDialogHeader.displayName = 'ChatAlertDialogHeader';

const ChatAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.ReactElement => (
  <div
    className={cn(
      'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2',
      className,
    )}
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
    className={cn('font-heading text-heading text-lg leading-snug font-bold', className)}
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
    className={cn('text-[15px] text-green-700', className)}
    {...props}
  />
));
ChatAlertDialogDescription.displayName = AlertDialogPrimitive.Description.displayName;

/**
 * What sets a destructive button apart from an ordinary `outlined` one: red. For the confirm in a
 * dialog and for the button that opens it.
 */
export const destructiveButtonClassName = cn(
  buttonVariants({ variant: 'outlined', size: 'touch' }),
  'border-danger-line text-danger-text hover:bg-danger-soft',
);

/**
 * The confirming button: `primary` by default. A confirm that destroys something, like leaving
 * a chat, is `destructive` and names the action in its label; Cancel stays the default focus.
 */
const ChatAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action> & {
    variant?: 'primary' | 'outlined' | 'destructive';
  }
>(({ className, variant = 'primary', ...props }, reference) => (
  <AlertDialogPrimitive.Action
    ref={reference}
    className={cn(
      variant === 'destructive'
        ? destructiveButtonClassName
        : buttonVariants({ variant, size: 'touch' }),
      className,
    )}
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
    className={cn(buttonVariants({ variant: 'outlined', size: 'touch' }), className)}
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
