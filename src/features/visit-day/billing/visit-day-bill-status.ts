import type { StaticTranslationString } from '@/types/types';

/**
 * Where a Besuchstag bill stands. Simpler than a camp bill's: nothing is synced and nothing
 * waits for a review. Whether its email arrived is kept apart, in the mail status, so a bill
 * that could not be mailed is still open for payment.
 */
export type VisitDayBillStatus = 'open' | 'paid' | 'cancelled';

export const VISIT_DAY_BILL_STATUS_LABELS: Record<VisitDayBillStatus, StaticTranslationString> = {
  open: { de: 'Offen', en: 'Open', fr: 'Ouverte' },
  paid: { de: 'Bezahlt', en: 'Paid', fr: 'Payée' },
  cancelled: { de: 'Storniert', en: 'Cancelled', fr: 'Annulée' },
};

export type VisitDayMailStatus = 'pending' | 'queued' | 'sent' | 'failed';

export const VISIT_DAY_MAIL_STATUS_LABELS: Record<VisitDayMailStatus, StaticTranslationString> = {
  pending: { de: 'Noch nicht verschickt', en: 'Not sent yet', fr: 'Pas encore envoyé' },
  queued: { de: 'In der Warteschlange', en: 'Queued', fr: 'En file d’attente' },
  sent: { de: 'Verschickt', en: 'Sent', fr: 'Envoyé' },
  failed: { de: 'Fehlgeschlagen', en: 'Failed', fr: 'Échec' },
};
