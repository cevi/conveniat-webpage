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
    'relative flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 min-w-[100px]',
    {
      variants: {
        variant: {
          primary: 'bg-green-500 hover:bg-green-600 focus:ring-green-500',
          danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        },
      },
      defaultVariants: {
        variant: 'primary',
      },
    },
  );

  const modalContent = (
    <div className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
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
