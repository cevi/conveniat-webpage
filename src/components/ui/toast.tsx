'use client';

import { Button } from '@/components/ui/buttons/button';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, CircleCheck, Info } from 'lucide-react';
import type React from 'react';
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';

export type ToastTone = 'info' | 'success' | 'error';

/**
 * The surface of a short notice floating above the tab bar: a toast, and the "Chat gelöscht"
 * banner, which is one that waits for its undo. Neutral for what is good to know, red for what
 * went wrong; brand green stays with the primary action of the screen.
 */
export const toastSurfaceClassName = (tone: ToastTone): string =>
  cn(
    'flex min-h-[52px] w-full items-center gap-3 overflow-hidden rounded-[14px] border py-1 pl-4 shadow-lg',
    tone === 'error'
      ? 'bg-danger-soft border-danger-line text-danger-text'
      : 'bg-quiet border-line text-green-900',
  );

const icons: Record<ToastTone, LucideIcon> = {
  info: Info,
  success: CircleCheck,
  error: AlertCircle,
};

interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  /** a second line, for the detail of what happened */
  description?: string | undefined;
  /** one way to act on it, such as "Nochmals"; the toast closes once it is used */
  action?: ToastAction | undefined;
  /** a toast with the id of one still shown replaces it instead of stacking */
  id?: string | undefined;
  duration?: number | undefined;
}

const ToastCard: React.FC<{
  tone: ToastTone;
  message: string;
  description: string | undefined;
  action: ToastAction | undefined;
  onClose: () => void;
}> = ({ tone, message, description, action, onClose }) => {
  const Icon = icons[tone];
  return (
    <div
      // an error is announced at once, the rest when the reader is free
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(toastSurfaceClassName(tone), action === undefined ? 'pr-4' : 'pr-1')}
    >
      <Icon
        className={cn('h-5 w-5 shrink-0', tone !== 'error' && 'text-green-700')}
        aria-hidden="true"
      />
      {/* a longer text wraps rather than squeezing the button */}
      <div className="min-w-0 flex-1 py-2">
        <p className="text-[15px] leading-5">{message}</p>
        {description !== undefined && description.length > 0 && (
          <p
            className={cn(
              'mt-0.5 text-[13px] leading-[18px]',
              tone === 'error' ? 'text-danger-text' : 'text-green-700',
            )}
          >
            {description}
          </p>
        )}
      </div>
      {action !== undefined && (
        <Button
          type="button"
          variant="outlined"
          size="touch"
          className="shrink-0"
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

const show = (tone: ToastTone, message: string, options: ToastOptions = {}): string | number =>
  sonnerToast.custom(
    (id) => (
      <ToastCard
        tone={tone}
        message={message}
        description={options.description}
        action={options.action}
        onClose={() => sonnerToast.dismiss(id)}
      />
    ),
    {
      // a toast to act on stays long enough to reach for its button
      duration: options.duration ?? (options.action === undefined ? 4000 : 8000),
      ...(options.id === undefined ? {} : { id: options.id }),
    },
  );

/**
 * The app's toasts, in the style of its other notices. Every toast of the public site and the
 * app goes through here; the admin panel keeps Payload's own `toast` from `@payloadcms/ui`.
 */
export const toast = {
  info: (message: string, options?: ToastOptions): string | number =>
    show('info', message, options),
  success: (message: string, options?: ToastOptions): string | number =>
    show('success', message, options),
  error: (message: string, options?: ToastOptions): string | number =>
    show('error', message, options),
  dismiss: (id?: string | number): string | number => sonnerToast.dismiss(id),
};

const containerLabel: StaticTranslationString = {
  de: 'Mitteilungen',
  en: 'Notifications',
  fr: 'Notifications',
};

/**
 * Where the toasts appear: at the bottom, above the app's tab bar, where the "Chat gelöscht"
 * banner sits too. It reads `--app-tab-bar-height`, so it belongs inside the app shell's content
 * wrapper, which sets it.
 */
export const Toaster: React.FC<{ locale: Locale }> = ({ locale }) => (
  <SonnerToaster
    position="bottom-center"
    offset={{ bottom: 'calc(var(--app-tab-bar-height) + 16px)' }}
    mobileOffset={{ bottom: 'calc(var(--app-tab-bar-height) + 16px)', left: 16, right: 16 }}
    gap={8}
    containerAriaLabel={containerLabel[locale]}
    style={{ '--width': '28rem' } as React.CSSProperties}
  />
);
