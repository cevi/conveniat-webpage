import { environmentVariables } from '@/config/environment-variables';
import {
  BILLING_ROLES,
  canAccessBilling,
  getUserGroups,
  hasAccessToThisUser,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { StaticTranslationString } from '@/types/types';
import type { CollectionConfig, Payload, PayloadRequest } from 'payload';

/** Everything that can happen to a Besuchstag bill, each a line in its history. */
export const VISIT_DAY_BILL_EVENT_LABELS = {
  created: { de: 'Rechnung erstellt', en: 'Bill created', fr: 'Facture créée' },
  issued: { de: 'Neu ausgestellt', en: 'Issued again', fr: 'Émise à nouveau' },
  mail_queued: { de: 'E-Mail eingereiht', en: 'Email queued', fr: 'E-mail mis en file' },
  mail_sent: { de: 'E-Mail verschickt', en: 'Email sent', fr: 'E-mail envoyé' },
  mail_failed: { de: 'E-Mail fehlgeschlagen', en: 'Email failed', fr: 'Échec de l’e-mail' },
  payment_booked: { de: 'Zahlung verbucht', en: 'Payment booked', fr: 'Paiement comptabilisé' },
  marked_paid: {
    de: 'Von Hand als bezahlt markiert',
    en: 'Marked paid by hand',
    fr: 'Marquée payée à la main',
  },
  double_payment_detected: {
    de: 'Doppelzahlung erkannt',
    en: 'Double payment detected',
    fr: 'Double paiement détecté',
  },
  double_payment_resolved: {
    de: 'Doppelzahlung erledigt',
    en: 'Double payment resolved',
    fr: 'Double paiement réglé',
  },
  persons_reduced: { de: 'Personen reduziert', en: 'Persons reduced', fr: 'Personnes réduites' },
  refund_due: { de: 'Rückerstattung offen', en: 'Refund due', fr: 'Remboursement dû' },
  refund_recorded: {
    de: 'Rückerstattung erfasst',
    en: 'Refund recorded',
    fr: 'Remboursement enregistré',
  },
  cancelled: { de: 'Storniert', en: 'Cancelled', fr: 'Annulée' },
} as const satisfies Record<string, StaticTranslationString>;

export type VisitDayBillEventAction = keyof typeof VISIT_DAY_BILL_EVENT_LABELS;

/**
 * The history of the Besuchstag bills: one row per change, written by the server only and
 * never changed afterwards. Every bill lists its own rows, and this list shows them all, so
 * finance can follow a week's payments or every cancellation across all bills.
 */
export const VisitDayBillEventsCollection: CollectionConfig = {
  slug: 'visit-day-bill-events',
  labels: {
    singular: {
      de: 'Besuchstag · Verlauf',
      en: 'Visiting day · History',
      fr: 'Journée des visites · Historique',
    },
    plural: {
      de: 'Besuchstag · Verlauf',
      en: 'Visiting day · History',
      fr: 'Journée des visites · Historique',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.BackofficeBilling.label,
    hidden: ({ user }): boolean =>
      !environmentVariables.FEATURE_ENABLE_VISIT_DAY ||
      !hasAccessToThisUser({ user: { groups: getUserGroups(user) }, requiredRoles: BILLING_ROLES }),
    hideAPIURL: true,
    useAsTitle: 'action',
    defaultColumns: ['createdAt', 'bill', 'action', 'actor', 'details'],
    listSearchableFields: ['details', 'actor'],
    description: {
      en: 'Every change to a Besuchstag bill: created, mailed, paid, reduced, cancelled. Written by the server only.',
      de: 'Jede Änderung an einer Besuchstag-Rechnung: erstellt, verschickt, bezahlt, reduziert, storniert. Wird nur vom Server geschrieben.',
      fr: 'Chaque changement d’une facture : créée, envoyée, payée, réduite, annulée. Écrit par le serveur seulement.',
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: canAccessBilling,
    // a history is appended to by the server and never rewritten, not even by an admin
    create: ({ req }): boolean => req.context['internal'] === true,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'bill',
      type: 'relationship',
      relationTo: 'visit-day-bills',
      required: true,
      index: true,
      label: { en: 'Bill', de: 'Rechnung', fr: 'Facture' },
      admin: { readOnly: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'action',
          type: 'select',
          required: true,
          index: true,
          options: Object.entries(VISIT_DAY_BILL_EVENT_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
          label: { en: 'What', de: 'Was', fr: 'Quoi' },
          admin: { readOnly: true },
        },
        {
          name: 'actor',
          type: 'text',
          required: true,
          label: { en: 'Who', de: 'Wer', fr: 'Qui' },
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'details',
      type: 'textarea',
      label: { en: 'Details', de: 'Details', fr: 'Détails' },
      admin: { readOnly: true },
    },
  ],
};

/**
 * Appends one line to a bill's history. Passing `req` writes it in the same transaction as the
 * change it describes, where Mongo runs with transactions. The local API's access override
 * writes it, never an `internal` context, which on a shared `req` would reach the rest of a
 * public registration request.
 */
export const recordVisitDayBillEvent = async (
  payload: Payload,
  event: { bill: string; action: VisitDayBillEventAction; actor: string; details?: string },
  request?: PayloadRequest,
): Promise<void> => {
  await payload.create({
    collection: 'visit-day-bill-events',
    overrideAccess: true,
    data: {
      bill: event.bill,
      action: event.action,
      actor: event.actor,
      ...(event.details === undefined ? {} : { details: event.details }),
    },
    ...(request === undefined ? {} : { req: request }),
  });
};
