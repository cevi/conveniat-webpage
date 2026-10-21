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
  resolve: { de: 'Als geprüft markieren', en: 'Mark as reviewed', fr: 'Marquer comme vérifiée' },
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
      de: 'Nur diese Anmeldung wird aus der Cevi.DB neu eingelesen, wie beim vollständigen Abgleich. Ausstehende Rückmeldungen an die Cevi.DB werden dabei nachgeholt. Eine bereits verrechnete Anmeldung wird nur dann zur manuellen Prüfung markiert, wenn sich Rolle, Geburtsdatum oder die Teilnahme selbst geändert haben.',
      en: 'Only this registration is read again from the Cevi.DB, as in the full sync. Pending write-backs to the Cevi.DB are retried. A registration that has already been billed is only flagged for manual review if its role, birthday or the participation itself changed.',
      fr: "Seule cette inscription est relue depuis la Cevi.DB, comme lors de la synchronisation complète. Les mises à jour en attente vers la Cevi.DB sont réessayées. Une inscription déjà facturée n'est marquée pour vérification manuelle que si son rôle, sa date de naissance ou la participation elle-même ont changé.",
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
  resolve: {
    title: {
      de: 'Prüfung abschliessen?',
      en: 'Close the review?',
      fr: 'Clore la vérification ?',
    },
    message: {
      de: 'Die bestehende Rechnung bleibt unverändert und die Anmeldung erhält wieder den Status ihrer Rechnung: «Rechnung gesendet», wenn sie versendet wurde, sonst «Rechnung erstellt». Der Kommentar erscheint im Sync-Verlauf.',
      en: 'The existing bill stays as it is, and the registration goes back to the status of its bill: "Bill sent" if it was sent, otherwise "Bill created". The comment appears in the sync history.',
      fr: "La facture existante reste inchangée et l'inscription reprend le statut de sa facture : « Facture envoyée » si elle a été envoyée, sinon « Facture créée ». Le commentaire apparaît dans l'historique de synchronisation.",
    },
    confirm: billingActionLabels.resolve,
    busy: { de: 'Wird gespeichert...', en: 'Saving...', fr: 'Enregistrement...' },
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

/** The label and example of the note the cancellation and the review closing ask for. */
const noteCopy: Partial<
  Record<BillingAction, { label: StaticTranslationString; placeholder: StaticTranslationString }>
> = {
  remove: {
    label: {
      de: 'Grund der Stornierung',
      en: 'Reason for the cancellation',
      fr: "Motif de l'annulation",
    },
    placeholder: {
      de: 'z.B. Abmeldung per E-Mail der AVP von Cevi Uster',
      en: 'e.g. deregistered by email from the AVP of Cevi Uster',
      fr: "p. ex. désinscription par e-mail de l'AVP de Cevi Uster",
    },
  },
  resolve: {
    label: {
      de: 'Kommentar zur Prüfung',
      en: 'Comment on the review',
      fr: 'Commentaire sur la vérification',
    },
    placeholder: {
      de: 'z.B. nur die Adresse hat geändert, Rechnung bleibt gültig',
      en: 'e.g. only the address changed, the bill stays valid',
      fr: "p. ex. seule l'adresse a changé, la facture reste valable",
    },
  },
};

/**
 * The confirmation for whichever billing action is pending, with a required note when the
 * action asks for one: the reason of a cancellation, or the comment closing a review.
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
  const note = actions.pending === undefined ? undefined : noteCopy[actions.pending];

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
      confirmDisabled={actions.needsNote && actions.note.trim() === ''}
    >
      {/* `undefined` rather than `false` otherwise, or the modal reserves the slot. */}
      {note === undefined ? undefined : (
        <TextareaInput
          path="billingActionNote"
          label={note.label[locale]}
          placeholder={note.placeholder[locale]}
          required
          rows={3}
          value={actions.note}
          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
            actions.setNote(event.target.value)
          }
        />
      )}
    </ConfirmationModal>
  );
};
