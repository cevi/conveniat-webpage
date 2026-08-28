'use client';

import type { BillingAdminDocumentKey } from '@/features/billing/admin-documents';
import { BILLING_ADMIN_DOCUMENTS } from '@/features/billing/admin-documents';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Button } from '@payloadcms/ui';
import { ExternalLink, X } from 'lucide-react';
import type React from 'react';
import { createPortal } from 'react-dom';

const closeLabel: StaticTranslationString = {
  de: 'Schliessen',
  en: 'Close',
  fr: 'Fermer',
};

const emptyLabel: StaticTranslationString = {
  de: 'Keine Details vorhanden.',
  en: 'No details available.',
  fr: 'Aucun détail disponible.',
};

const introLabel: StaticTranslationString = {
  de: 'Diese Einträge konnten nicht verarbeitet werden. Alle übrigen wurden normal verarbeitet.',
  en: 'These records could not be processed. Everything else went through normally.',
  fr: "Ces enregistrements n'ont pas pu être traités. Tous les autres sont passés normalement.",
};

/**
 * Lists, in full, the records a billing run could not process.
 *
 * The step itself only says how many failed; the point of this dialog is to name them,
 * so an operator can act on the actual records rather than re-running blind.
 */
export const BillingErrorsDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  errors: string[];
  /** Settings pages that have to be fixed for the run to succeed. */
  relatedDocuments: BillingAdminDocumentKey[];
  locale: Locale;
}> = ({ isOpen, onClose, title, errors, relatedDocuments, locale }) => {
  if (!isOpen) return <></>;

  const dialog = (
    <div
      className="fixed inset-0 z-900 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-label={title}
        aria-modal="true"
        className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-(--theme-elevation-150) bg-(--theme-elevation-0) shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-(--theme-elevation-100) p-5">
          <div className="min-w-0">
            <h3 className="m-0 text-base font-semibold text-(--theme-elevation-900)">{title}</h3>
            <p className="m-0 mt-1 text-xs text-(--theme-elevation-500)">{introLabel[locale]}</p>
          </div>
          <button
            aria-label={closeLabel[locale]}
            className="shrink-0 cursor-pointer rounded p-1 text-(--theme-elevation-500) hover:bg-(--theme-elevation-100)"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {errors.length === 0 ? (
            <p className="m-0 text-sm text-(--theme-elevation-500)">{emptyLabel[locale]}</p>
          ) : (
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {errors.map((message, index) => (
                <li
                  key={index}
                  className="flex gap-3 rounded border border-(--theme-elevation-100) p-3 text-sm text-(--theme-elevation-800)"
                >
                  <span className="shrink-0 font-mono text-xs text-(--theme-elevation-400)">
                    {index + 1}
                  </span>
                  <span className="min-w-0 break-words">{message}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {relatedDocuments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-(--theme-elevation-100) px-5 py-3">
            {relatedDocuments.map((key) => (
              <a
                key={key}
                className="inline-flex items-center gap-1.5 rounded border border-(--theme-elevation-150) px-3 py-1.5 text-sm text-(--theme-elevation-800) hover:bg-(--theme-elevation-100)"
                href={BILLING_ADMIN_DOCUMENTS[key].href}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {BILLING_ADMIN_DOCUMENTS[key].label[locale]}
              </a>
            ))}
          </div>
        )}

        <div className="flex justify-end border-t border-(--theme-elevation-100) p-4">
          <Button buttonStyle="secondary" margin={false} onClick={onClose} size="medium">
            {closeLabel[locale]}
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
};
