'use client';

import type { BillingAction, BillingActions } from '@/features/billing/hooks/use-billing-actions';
import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import type { Locale, StaticTranslationString } from '@/types/types';
import { TextareaInput } from '@payloadcms/ui';
import type React from 'react';

/** The labels of every billing action, for the row menu and the edit view alike. */
export const billingActionLabels: Record<
  'preview' | 'download' | BillingAction,
  StaticTranslationString
> = {
  preview: { de: 'Vorschau', en: 'Preview', fr: 'Aperçu' },
  download: { de: 'Download', en: 'Download', fr: 'Télécharger' },
  send: { de: 'E-Mail senden', en: 'Send email', fr: "Envoyer l'e-mail" },
  reminder: {
    de: 'Erinnerung an Adressverwalter senden',
    en: 'Send reminder to address managers',
    fr: "Envoyer un rappel aux gestionnaires d'adresses",
  },
  sync: {
    de: 'Mit Cevi.DB abgleichen',
    en: 'Sync with Cevi.DB',
    fr: 'Synchroniser avec la Cevi.DB',
  },
  regenerate: { de: 'Neu generieren', en: 'Regenerate', fr: 'Régénérer' },
  remove: { de: 'Stornieren', en: 'Cancel registration', fr: "Annuler l'inscription" },
};

const sendingLabel: StaticTranslationString = {
  de: 'Wird versendet...',
  en: 'Sending...',
  fr: 'Envoi...',
};

const confirmationCopy: Record<
  BillingAction,
  {
    title: StaticTranslationString;
    message: StaticTranslationString;
    confirm: StaticTranslationString;
    busy: StaticTranslationString;
  }
> = {
  sync: {
    title: {
      de: 'Mit der Cevi.DB abgleichen?',
      en: 'Sync with the Cevi.DB?',
      fr: 'Synchroniser avec la Cevi.DB ?',
    },
    message: {
      de: 'Nur diese Anmeldung wird aus der Cevi.DB neu eingelesen, wie beim vollständigen Abgleich. Ausstehende Rückmeldungen an die Cevi.DB werden dabei nachgeholt. Eine bereits verrechnete Anmeldung mit geänderten Angaben wird zur manuellen Prüfung markiert.',
      en: 'Only this registration is read again from the Cevi.DB, as in the full sync. Pending write-backs to the Cevi.DB are retried. A registration that has already been billed and whose data changed is flagged for manual review.',
      fr: 'Seule cette inscription est relue depuis la Cevi.DB, comme lors de la synchronisation complète. Les mises à jour en attente vers la Cevi.DB sont réessayées. Une inscription déjà facturée dont les données ont changé est marquée pour vérification manuelle.',
    },
    confirm: { de: 'Abgleichen', en: 'Sync', fr: 'Synchroniser' },
    busy: { de: 'Wird abgeglichen...', en: 'Syncing...', fr: 'Synchronisation...' },
  },
  send: {
    title: { de: 'Rechnung versenden?', en: 'Send the bill?', fr: 'Envoyer la facture ?' },
    message: {
      de: 'Die Rechnung wird als E-Mail an die für die Rechnung hinterlegte Adresse dieser Person versendet. Das lässt sich nicht rückgängig machen.',
      en: 'The bill is emailed to the invoice address on file for this person. This cannot be undone.',
      fr: "La facture sera envoyée par e-mail à l'adresse de facturation enregistrée. Cette action est irréversible.",
    },
    confirm: { de: 'Versenden', en: 'Send', fr: 'Envoyer' },
    busy: sendingLabel,
  },
  regenerate: {
    title: {
      de: 'Rechnung neu generieren?',
      en: 'Regenerate the bill?',
      fr: 'Régénérer la facture ?',
    },
    message: {
      de: 'Möchten Sie diese Rechnung wirklich neu generieren? Das bestehende PDF und die Rechnungsnummer werden unwiderruflich überschrieben.',
      en: 'Do you really want to regenerate this bill? The existing PDF and invoice number are irreversibly overwritten.',
      fr: 'Voulez-vous vraiment régénérer cette facture ? Le PDF et le numéro de facture existants seront écrasés définitivement.',
    },
    confirm: billingActionLabels.regenerate,
    busy: { de: 'Wird generiert...', en: 'Regenerating...', fr: 'Régénération...' },
  },
  remove: {
    title: {
      de: 'Anmeldung stornieren?',
      en: 'Cancel this registration?',
      fr: 'Annuler cette inscription ?',
    },
    message: {
      de: 'Die Anmeldung wird storniert und nicht mehr verrechnet oder abgeglichen. Eine bereits erstellte Rechnung bleibt zur Nachvollziehbarkeit erhalten. Der Grund erscheint im Sync-Verlauf. Rückgängig machen lässt sich das nur, indem die Anmeldung in der Cevi.DB wieder aktiviert wird.',
      en: 'The registration is cancelled and is no longer billed or synced. Any bill already raised is kept for the record. The reason appears in the sync history. This can only be undone by reactivating the registration in the Cevi.DB.',
      fr: "L'inscription est annulée et n'est plus facturée ni synchronisée. Une facture déjà émise est conservée. Le motif apparaît dans l'historique de synchronisation. Seule une réactivation de l'inscription dans la Cevi.DB permet d'annuler cette action.",
    },
    confirm: billingActionLabels.remove,
    busy: { de: 'Wird storniert...', en: 'Cancelling...', fr: 'Annulation...' },
  },
  reminder: {
    title: {
      de: 'Erinnerung an Adressverwalter senden?',
      en: 'Send a reminder to the address managers?',
      fr: "Envoyer un rappel aux gestionnaires d'adresses ?",
    },
    message: {
      de: 'Die Adressverwalter/-innen dieses Hofs erhalten eine E-Mail mit dieser Anmeldung und den fehlenden Pflichtangaben. Sind für den Hof keine Empfänger hinterlegt, wird nichts versendet.',
      en: 'The address managers of this Hof receive an email listing this registration and its missing mandatory fields. Nothing is sent if the Hof has no recipients configured.',
      fr: "Les gestionnaires d'adresses de ce Hof reçoivent un e-mail avec cette inscription et les données obligatoires manquantes. Rien n'est envoyé si aucun destinataire n'est configuré.",
    },
    confirm: { de: 'Erinnerung senden', en: 'Send reminder', fr: 'Envoyer le rappel' },
    busy: sendingLabel,
  },
};

const removeReasonLabel: StaticTranslationString = {
  de: 'Grund der Stornierung',
  en: 'Reason for the cancellation',
  fr: "Motif de l'annulation",
};

const removeReasonPlaceholder: StaticTranslationString = {
  de: 'z.B. Abmeldung per E-Mail der AVP von Cevi Uster',
  en: 'e.g. deregistered by email from the AVP of Cevi Uster',
  fr: "p. ex. désinscription par e-mail de l'AVP de Cevi Uster",
};

/**
 * The confirmation for whichever billing action is pending, with the cancellation reason
 * input when the registration is being cancelled.
 *
 * Rendered through the shared modal, which portals to `document.body`. An overlay written
 * inline in a list cell cannot win on z-index at any value: Payload's table sets
 * `isolation: isolate` on `.table` and `position: relative; z-index: 1` on every `th`/`td`,
 * so the overlay was confined to its own cell's stacking context and any cell later in the
 * document painted straight over it.
 */
export const BillingActionDialog: React.FC<{ actions: BillingActions; locale: Locale }> = ({
  actions,
  locale,
}) => {
  const copy = confirmationCopy[actions.pending ?? 'regenerate'];
  const message = copy.message[locale];

  return (
    <ConfirmationModal
      isOpen={actions.pending !== undefined}
      onClose={actions.cancel}
      onConfirm={actions.confirm}
      title={copy.title[locale]}
      // The shared modal renders the body with `whitespace-pre-line`, so a failure is
      // appended as its own paragraph rather than needing a second slot.
      message={actions.error === undefined ? message : `${message}\n\n⚠ ${actions.error}`}
      confirmLabel={copy.confirm[locale]}
      submittingText={copy.busy[locale]}
      isSubmitting={actions.loading}
      locale={locale}
      confirmVariant="danger"
      confirmDisabled={actions.pending === 'remove' && actions.removeReason.trim() === ''}
    >
      {/* `undefined` rather than `false` otherwise, or the modal reserves the slot. */}
      {actions.pending === 'remove' ? (
        <TextareaInput
          path="cancellationReason"
          label={removeReasonLabel[locale]}
          placeholder={removeReasonPlaceholder[locale]}
          required
          rows={3}
          value={actions.removeReason}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            actions.setRemoveReason(event.target.value)
          }
        />
      ) : undefined}
    </ConfirmationModal>
  );
};
