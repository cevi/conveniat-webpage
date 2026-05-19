import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { cva } from 'class-variance-authority';
import React from 'react';
import { createPortal } from 'react-dom';

const cancelButtonString: StaticTranslationString = {
  en: 'Cancel',
  de: 'Abbrechen',
  fr: 'Annuler',
};

export const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  message: string;
  isSubmitting: boolean;
  locale: Config['locale'];
  title: string;
  confirmLabel: string;
  submittingText: string;
  confirmVariant?: 'primary' | 'danger';
  hideCancel?: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  isSubmitting,
  locale,
  title,
  confirmLabel,
  submittingText,
  confirmVariant = 'primary',
  hideCancel = false,
}) => {
  if (!isOpen) return <></>;

  const confirmClasses = cva(
    'cursor-pointer relative flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 min-w-[100px]',
    {
      variants: {
        variant: {
          primary:
            'bg-[var(--theme-success-500)] hover:bg-[var(--theme-success-600)] focus:ring-[var(--theme-success-500)]',
          danger:
            'bg-[var(--theme-error-500)] hover:bg-[var(--theme-error-600)] focus:ring-[var(--theme-error-500)]',
        },
      },
      defaultVariants: {
        variant: 'primary',
      },
    },
  );

  const modalContent = (
    <div className="fixed inset-0 z-900 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-lg border border-(--theme-elevation-150) bg-(--theme-elevation-0) p-6 shadow-2xl">
        <h3 className="mb-4 text-xl font-semibold text-(--theme-elevation-900)">{title}</h3>
        <p className="mb-6 whitespace-pre-line text-(--theme-elevation-600)">{message}</p>
        <div className="flex justify-end gap-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cursor-pointer rounded-md border border-(--theme-elevation-150) bg-(--theme-elevation-50) px-4 py-2 text-sm font-medium text-[var(--theme-elevation-800)] hover:bg-[var(--theme-elevation-100)] focus:ring-2 focus:ring-[var(--theme-success-500)] focus:ring-offset-2 focus:outline-none disabled:opacity-50"
            >
              {cancelButtonString[locale]}
            </button>
          )}
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
            className={confirmClasses({ variant: confirmVariant })}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{submittingText}</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return modalContent;
  return createPortal(modalContent, document.body);
};
