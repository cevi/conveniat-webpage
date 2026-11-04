'use client';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import { useVisitDayBillAction } from '@/features/visit-day/billing/components/use-visit-day-bill-action';
import type { VisitDayBillAction } from '@/features/visit-day/billing/visit-day-bill-endpoints';
import type { Locale, StaticTranslationString } from '@/types/types';
import {
  Banner,
  Button,
  TextInput,
  useDocumentInfo,
  useFormFields,
  useLocale,
} from '@payloadcms/ui';
import type React from 'react';
import { useState } from 'react';

type Dialog = 'reissue' | 'reduce' | 'cancel' | 'mark-paid' | undefined;

const t = {
  heading: { de: 'Aktionen', en: 'Actions', fr: 'Actions' },
  pdf: { de: 'PDF ansehen', en: 'View PDF', fr: 'Voir le PDF' },
  resend: { de: 'Erneut senden', en: 'Send again', fr: 'Renvoyer' },
  reissue: { de: 'Neu ausstellen', en: 'Issue again', fr: 'Émettre à nouveau' },
  reduce: { de: 'Personen reduzieren …', en: 'Reduce persons …', fr: 'Réduire les personnes …' },
  markPaid: {
    de: 'Als bezahlt markieren …',
    en: 'Mark as paid …',
    fr: 'Marquer comme payée …',
  },
  cancel: { de: 'Stornieren …', en: 'Cancel …', fr: 'Annuler …' },
  running: { de: 'Wird ausgeführt…', en: 'Working…', fr: 'En cours…' },
  reason: {
    de: 'Grund (erscheint im Verlauf)',
    en: 'Reason (shown in the history)',
    fr: 'Raison (dans l’historique)',
  },
  howPaid: { de: 'Wie wurde bezahlt?', en: 'How was it paid?', fr: 'Comment a-t-elle été payée ?' },
  keep: { de: 'Wer bleibt angemeldet?', en: 'Who stays registered?', fr: 'Qui reste inscrit ?' },
  person: { de: 'Person', en: 'Person', fr: 'Personne' },
  reissueMessage: {
    de: 'Stellt die Rechnung zu den aktuellen Preisen mit einer neuen Referenz neu aus und verschickt sie. Die alte Referenz wird beim Import weiterhin erkannt.',
    en: 'Issues the bill again at today’s prices with a new reference and mails it. The old reference is still recognised by the import.',
    fr: 'Émet la facture aux prix actuels avec une nouvelle référence et l’envoie. L’ancienne référence reste reconnue à l’import.',
  },
  reduceMessage: {
    de: 'Gibt die Plätze der abgemeldeten Personen frei und verschickt eine neue Rechnung für die übrigen. Was bereits zu viel bezahlt wurde, erscheint als «Rückerstattung offen» und wird von Hand zurückbezahlt.',
    en: 'Frees the places of the persons who no longer come and mails a new bill for the others. Anything already paid beyond it shows as «refund due» and is paid back by hand.',
    fr: 'Libère les places des personnes désinscrites et envoie une nouvelle facture pour les autres. Ce qui a déjà été payé en trop apparaît comme « remboursement dû » et se rembourse à la main.',
  },
  cancelMessage: {
    de: 'Storniert die Anmeldung für alle Personen und gibt ihre Plätze frei. Das lässt sich nicht rückgängig machen. Bereits Bezahltes erscheint als «Rückerstattung offen».',
    en: 'Cancels the registration for every person and frees their places. This cannot be undone. Anything already paid shows as «refund due».',
    fr: 'Annule l’inscription pour toutes les personnes et libère leurs places. Irréversible. Ce qui a été payé apparaît comme « remboursement dû ».',
  },
  markPaidMessage: {
    de: 'Für eine Zahlung, die nicht über die Bank kam, z.B. bar im Büro. Ohne Zahlung im Bankimport bleibt nur dieser Vermerk.',
    en: 'For a payment that did not come through the bank, e.g. cash at the office. Without a bank payment, this note is all there is.',
    fr: 'Pour un paiement hors banque, p. ex. en espèces au bureau. Sans paiement bancaire, seule cette note en témoigne.',
  },
  confirm: { de: 'Ausführen', en: 'Confirm', fr: 'Confirmer' },
  cancelConfirm: { de: 'Stornieren', en: 'Cancel registration', fr: 'Annuler l’inscription' },
} satisfies Record<string, StaticTranslationString>;

const readValue = <T,>(value: unknown, guard: (value: unknown) => value is T): T | undefined =>
  guard(value) ? value : undefined;
const isString = (value: unknown): value is string => typeof value === 'string';
const isNumber = (value: unknown): value is number => typeof value === 'number';

// Payload's Button has no destructive style, so the secondary one takes the theme's error
// colours, as on the camp bills.
const destructiveButtonClasses =
  '[--btn-border:1px_solid_var(--theme-error-500)]! [--color:var(--theme-error-500)]! [--hover-btn-border:1px_solid_var(--theme-error-400)]! [--hover-color:var(--theme-error-400)]!';

/** The persons a bill still has, from its travel passes, for the reduce dialog. */
const usePersonNumbers = (persons: number | undefined): number[] => {
  const passes = useFormFields(([fields]) => fields['travelPasses']?.rows?.length ?? 0);
  const numbers = useFormFields(([fields]) =>
    Array.from({ length: passes }, (_, index) =>
      readValue(fields[`travelPasses.${String(index)}.personNumber`]?.value, isNumber),
    ).filter((number) => number !== undefined),
  );
  if (numbers.length > 0) return numbers;
  return Array.from({ length: persons ?? 0 }, (_, index) => index + 1);
};

/** The actions of a Besuchstag bill, in its sidebar. */
export const VisitDayBillActions: React.FC = () => {
  const { id } = useDocumentInfo();
  const locale: Locale = resolveAdminLocale(useLocale().code);
  const status = useFormFields(([fields]) => readValue(fields['status']?.value, isString));
  const persons = useFormFields(([fields]) => readValue(fields['persons']?.value, isNumber));
  const pdf = useFormFields(([fields]) => fields['pdf']?.value);
  const personNumbers = usePersonNumbers(persons);
  const { isRunning, error, run, clearError } = useVisitDayBillAction();
  const [dialog, setDialog] = useState<Dialog>();
  const [text, setText] = useState('');
  const [kept, setKept] = useState<number[]>([]);

  if (id === undefined) return <></>;
  const cancelled = status === 'cancelled';
  const pdfId = typeof pdf === 'string' ? pdf : undefined;

  const open = (next: Dialog): void => {
    clearError();
    setText('');
    setKept(personNumbers.slice(0, 1));
    setDialog(next);
  };
  const close = (): void => setDialog(undefined);
  const actionFor = (current: NonNullable<Dialog>): VisitDayBillAction => {
    switch (current) {
      case 'reissue': {
        return { action: 'reissue', reason: text };
      }
      case 'reduce': {
        return { action: 'reduce', keepPersonNumbers: kept, reason: text };
      }
      case 'cancel': {
        return { action: 'cancel', reason: text };
      }
      case 'mark-paid': {
        return { action: 'mark-paid', note: text };
      }
    }
  };
  const confirm = async (): Promise<void> => {
    if (dialog === undefined) return;
    if (await run(actionFor(dialog))) close();
  };

  const messages: Record<NonNullable<Dialog>, StaticTranslationString> = {
    reissue: t.reissueMessage,
    reduce: t.reduceMessage,
    cancel: t.cancelMessage,
    'mark-paid': t.markPaidMessage,
  };
  const titles: Record<NonNullable<Dialog>, StaticTranslationString> = {
    reissue: t.reissue,
    reduce: t.reduce,
    cancel: t.cancel,
    'mark-paid': t.markPaid,
  };
  const needsText = dialog === 'reduce' || dialog === 'cancel' || dialog === 'mark-paid';

  return (
    <div className="mb-8 flex flex-col gap-2">
      <span className="text-sm font-semibold text-(--theme-elevation-800)">
        {t.heading[locale]}
      </span>
      {error !== undefined && dialog === undefined && (
        <Banner className="m-0" type="error">
          {error}
        </Banner>
      )}
      <div className="flex flex-col gap-2">
        {pdfId === undefined ? (
          <Button buttonStyle="secondary" size="small" margin={false} disabled>
            {t.pdf[locale]}
          </Button>
        ) : (
          <Button
            buttonStyle="secondary"
            size="small"
            margin={false}
            el="anchor"
            url={`/api/visit-day-bills/${String(id)}/pdf`}
            newTab
          >
            {t.pdf[locale]}
          </Button>
        )}
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={cancelled || isRunning}
          onClick={(): void => {
            void run({ action: 'resend' });
          }}
        >
          {isRunning && dialog === undefined ? t.running[locale] : t.resend[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={cancelled || status === 'paid'}
          onClick={(): void => open('reissue')}
        >
          {t.reissue[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={cancelled || personNumbers.length < 2}
          onClick={(): void => open('reduce')}
        >
          {t.reduce[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          disabled={status !== 'open'}
          onClick={(): void => open('mark-paid')}
        >
          {t.markPaid[locale]}
        </Button>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          className={destructiveButtonClasses}
          disabled={cancelled}
          onClick={(): void => open('cancel')}
        >
          {t.cancel[locale]}
        </Button>
      </div>

      <ConfirmationModal
        isOpen={dialog !== undefined}
        onClose={close}
        onConfirm={confirm}
        title={dialog === undefined ? '' : titles[dialog][locale]}
        message={dialog === undefined ? '' : messages[dialog][locale]}
        confirmLabel={dialog === 'cancel' ? t.cancelConfirm[locale] : t.confirm[locale]}
        confirmVariant={dialog === 'cancel' ? 'danger' : 'primary'}
        submittingText={t.running[locale]}
        isSubmitting={isRunning}
        confirmDisabled={
          (needsText && text.trim() === '') || (dialog === 'reduce' && kept.length === 0)
        }
        locale={locale}
      >
        <div className="flex flex-col gap-3">
          {dialog === 'reduce' && (
            <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
              <legend className="mb-1 text-sm font-medium">{t.keep[locale]}</legend>
              {personNumbers.map((number) => (
                <label key={number} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={kept.includes(number)}
                    onChange={(event) =>
                      setKept((current) =>
                        event.target.checked
                          ? [...current, number]
                          : current.filter((other) => other !== number),
                      )
                    }
                  />
                  {t.person[locale]} {number}
                </label>
              ))}
            </fieldset>
          )}
          {dialog !== undefined && (
            <TextInput
              path="visitDayBillActionText"
              label={dialog === 'mark-paid' ? t.howPaid[locale] : t.reason[locale]}
              required={needsText}
              value={text}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setText(event.target.value)}
            />
          )}
          {error !== undefined && (
            <Banner className="m-0" type="error">
              {error}
            </Banner>
          )}
        </div>
      </ConfirmationModal>
    </div>
  );
};
