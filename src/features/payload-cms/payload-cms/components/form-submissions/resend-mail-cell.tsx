'use client';

import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Button, useLocale } from '@payloadcms/ui';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, Mail, RotateCcw, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';

interface ResendableEmailOption {
  id: string;
  to: string;
  subject: string;
  deliveryStatus: 'pending' | 'success' | 'error' | null;
  createdAt: string;
  smtpReceivedAt?: string | null;
  dsnReceivedAt?: string | null;
}

interface ResendMailCellProperties {
  rowData?: { id?: string; form?: string | { id?: string } } & Record<string, unknown>;
}

const translations = {
  buttonLabel: {
    en: 'Resend Mail',
    de: 'E-Mail erneut senden',
    fr: "Renvoyer l'e-mail",
  } satisfies StaticTranslationString,
  modalTitle: {
    en: 'Resend Mail',
    de: 'E-Mail erneut senden',
    fr: "Renvoyer l'e-mail",
  } satisfies StaticTranslationString,
  modalDescription: {
    en: 'Select one or more mails that were sent for this submission and resend them.',
    de: 'Wählen Sie eine oder mehrere E-Mails aus, die für diese Einreichung gesendet wurden, und senden Sie sie erneut.',
    fr: 'Sélectionnez un ou plusieurs e-mails envoyés pour cette soumission et renvoyez-les.',
  } satisfies StaticTranslationString,
  loadingOptions: {
    en: 'Loading mails...',
    de: 'E-Mails werden geladen...',
    fr: 'Chargement des e-mails...',
  } satisfies StaticTranslationString,
  noOptions: {
    en: 'No mails found for this submission.',
    de: 'Keine E-Mails für diese Einreichung gefunden.',
    fr: 'Aucun e-mail trouvé pour cette soumission.',
  } satisfies StaticTranslationString,
  selectAll: {
    en: 'Select all',
    de: 'Alle auswählen',
    fr: 'Tout sélectionner',
  } satisfies StaticTranslationString,
  deselectAll: {
    en: 'Deselect all',
    de: 'Alle abwählen',
    fr: 'Tout désélectionner',
  } satisfies StaticTranslationString,
  resendButton: {
    en: 'Resend selected',
    de: 'Ausgewählte erneut senden',
    fr: 'Renvoyer la sélection',
  } satisfies StaticTranslationString,
  cancelButton: {
    en: 'Cancel',
    de: 'Abbrechen',
    fr: 'Annuler',
  } satisfies StaticTranslationString,
  sending: {
    en: 'Sending...',
    de: 'Wird gesendet...',
    fr: 'Envoi en cours...',
  } satisfies StaticTranslationString,
  success: {
    en: 'Mail resent successfully.',
    de: 'E-Mail erfolgreich erneut gesendet.',
    fr: 'E-mail renvoyé avec succès.',
  } satisfies StaticTranslationString,
  error: {
    en: 'Failed to resend mail.',
    de: 'E-Mail konnte nicht erneut gesendet werden.',
    fr: 'Échec du renvoi de l’e-mail.',
  } satisfies StaticTranslationString,
  deliveryStatus: {
    pending: {
      en: 'Pending',
      de: 'Ausstehend',
      fr: 'En attente',
    } satisfies StaticTranslationString,
    success: {
      en: 'Sent',
      de: 'Gesendet',
      fr: 'Envoyé',
    } satisfies StaticTranslationString,
    error: {
      en: 'Error',
      de: 'Fehler',
      fr: 'Erreur',
    } satisfies StaticTranslationString,
  },
};

const formatDateTime = (value: string, locale: Config['locale']): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed);
};

export const ResendMailCell: React.FC<ResendMailCellProperties> = ({ rowData }) => {
  const { code } = useLocale() as { code: Config['locale'] };
  const submissionId = rowData?.id;
  const formId = rowData?.form ?? undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emails, setEmails] = useState<ResendableEmailOption[]>([]);
  const [selectedEmailIds, setSelectedEmailIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen || typeof formId !== 'string' || formId.length === 0) {
      return;
    }

    const loadOptions = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setErrorMessage(undefined);

        const response = await fetch(`/api/forms/${submissionId}/resend-options`);
        if (!response.ok) {
          throw new Error('Failed to load mail options');
        }

        const data = (await response.json()) as { emails?: ResendableEmailOption[] };

        const loadedEmails = Array.isArray(data.emails) ? data.emails : [];
        setEmails(loadedEmails);
        setSelectedEmailIds([]);
      } catch {
        setEmails([]);
        setSelectedEmailIds([]);
        setErrorMessage(translations.error[code]);
      } finally {
        setIsLoading(false);
      }
    };

    void loadOptions();
  }, [code, formId, isOpen, submissionId]);

  const allSelected = useMemo(
    () => emails.length > 0 && selectedEmailIds.length === emails.length,
    [emails.length, selectedEmailIds.length],
  );

  const toggleEmail = (emailId: string): void => {
    setSelectedEmailIds((current) =>
      current.includes(emailId)
        ? current.filter((existingId) => existingId !== emailId)
        : [...current, emailId],
    );
  };

  const toggleAll = (): void => {
    if (allSelected) {
      setSelectedEmailIds([]);
      return;
    }

    setSelectedEmailIds(emails.map((email) => email.id));
  };

  const resendSelected = async (): Promise<void> => {
    if (typeof submissionId !== 'string' || submissionId.length === 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(undefined);
      setErrorMessage(undefined);

      const response = await fetch(`/api/forms/${submissionId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outgoingEmailIds: selectedEmailIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend mail');
      }

      const data = (await response.json()) as { message?: string };
      setFeedback(data.message ?? translations.success[code]);
      setIsOpen(false);
    } catch {
      setErrorMessage(translations.error[code]);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (typeof submissionId !== 'string' || submissionId.length === 0) {
    return <></>;
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        buttonStyle="secondary"
        onClick={() => setIsOpen(true)}
        className="m-0 whitespace-nowrap"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {translations.buttonLabel[code]}
      </Button>
      {feedback && <span className="text-sm font-medium text-green-600">{feedback}</span>}
      {errorMessage && <span className="text-sm font-medium text-red-600">{errorMessage}</span>}

      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[1000] w-[min(92vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--theme-elevation-150)] bg-[var(--theme-elevation-50)] p-6 text-[var(--theme-text)] shadow-[0_16px_50px_rgba(0,0,0,0.25)] dark:border-[var(--theme-elevation-150)] dark:bg-[var(--theme-elevation-50)]">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-xl font-semibold">
                  {translations.modalTitle[code]}
                </Dialog.Title>
                <Dialog.Description className="mt-2 text-sm text-[var(--theme-text-dim)]">
                  {translations.modalDescription[code]}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-md p-2 text-[var(--theme-text-dim)] transition hover:bg-black/5 hover:text-[var(--theme-text)] dark:hover:bg-white/5"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </Dialog.Close>
            </div>

            <div className="max-h-[50vh] overflow-auto rounded-lg border border-[var(--theme-elevation-100)] bg-white/70 p-3 dark:bg-black/10">
              {isLoading && (
                <div className="flex items-center gap-2 p-3 text-sm text-[var(--theme-text-dim)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translations.loadingOptions[code]}
                </div>
              )}

              {!isLoading && emails.length === 0 && (
                <div className="p-3 text-sm text-[var(--theme-text-dim)]">
                  {translations.noOptions[code]}
                </div>
              )}

              {!isLoading && emails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={toggleAll}
                      className={cn(
                        'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-200 focus:ring-2 focus:ring-[var(--theme-success-500)] focus:ring-offset-2 focus:outline-none',
                        {
                          'border-[var(--theme-success-400)] bg-[var(--theme-success-100)] text-[var(--theme-success-900)] shadow-sm hover:bg-[var(--theme-success-200)]':
                            allSelected,
                          'border-[var(--theme-elevation-150)] bg-white text-[var(--theme-text)] shadow-sm hover:border-[var(--theme-success-300)] hover:bg-[var(--theme-success-50)] hover:shadow-md':
                            !allSelected,
                        },
                      )}
                    >
                      {allSelected ? translations.deselectAll[code] : translations.selectAll[code]}
                    </button>
                  </div>
                  {emails.map((email) => {
                    const isSelected = selectedEmailIds.includes(email.id);
                    return (
                      <label
                        key={email.id}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition',
                          {
                            'border-[var(--theme-success-500)] bg-[var(--theme-success-50)]':
                              isSelected,
                            'border-[var(--theme-elevation-150)] bg-white hover:bg-[var(--theme-elevation-100)]':
                              !isSelected,
                          },
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmail(email.id)}
                          className="mt-1 h-4 w-4 rounded border-[var(--theme-elevation-150)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-[var(--theme-text)]">
                              {email.subject}
                            </span>
                            <span className="rounded-full border border-[var(--theme-elevation-150)] px-2 py-0.5 text-xs text-[var(--theme-text-dim)]">
                              {translations.deliveryStatus[email.deliveryStatus ?? 'pending'][code]}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--theme-text-dim)]">
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3.5 w-3.5" />
                              {email.to}
                            </span>
                            <span>{formatDateTime(email.createdAt, code)}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                buttonStyle="primary"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
              >
                {translations.cancelButton[code]}
              </Button>
              <Button
                type="button"
                buttonStyle="primary"
                onClick={() => void resendSelected()}
                disabled={isSubmitting || selectedEmailIds.length === 0 || isLoading}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {translations.sending[code]}
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {translations.resendButton[code]}
                  </>
                )}
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default ResendMailCell;
