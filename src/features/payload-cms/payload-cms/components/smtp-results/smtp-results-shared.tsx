import React from 'react';

/**
 * Extracts the email address from a potentially formatted string like:
 * "Name" <email@domain.com>
 * @param email - The email string to parse.
 * @returns The extracted email address or the original string.
 */
export const extractEmailAddress = (email: string): string => {
  const trimmed = email.trim();
  const hasBrackets = trimmed.includes('<') || trimmed.includes('>');

  if (hasBrackets) {
    const match = trimmed.match(/<([^>]+)>$/);
    const extracted = match?.[1];

    if (typeof extracted === 'string' && extracted.length > 0) {
      return extracted.trim();
    }
    // malformed bracketed email
    return '';
  }

  return trimmed;
};

export interface SmtpResult {
  success: boolean;
  to: string;
  bounceReport?: boolean;
  response?: {
    accepted?: string[];
    rejected?: string[];
    envelopeTime?: number;
    messageTime?: number;
    messageSize?: number;
    response?: string;
    messageId?: string;
    envelope?: {
      from: string;
      to: string[];
    };
  };
  error?: string;
}

export const LOCALIZED_SMTP_LABELS = {
  en: {
    smtpSuccess: 'SMTP: Successfully Sent',
    smtpError: 'SMTP: Error Sending',
    smtpEmpty: 'SMTP: No data',
    smtpPending: 'SMTP: Status Unknown (Pending)',
    dsnSuccess: 'DSN: Successfully Delivered',
    dsnError: 'DSN: Delivery Error (Bounce)',
    dsnPending: 'DSN: Status Unknown (Pending)',
    dsnEmpty: 'DSN: No data',
    noResults: 'No SMTP results available.',
    details: 'Hover for details',
    sectionTitle: 'Mail Status',
    dsnActionRelayed:
      'The email was successfully forwarded to the next server, but that server does not send back a final delivery confirmation.',
    dsnActionDelivered: "The email was successfully delivered to the recipient's inbox.",
    dsnActionFailed: 'The email could not be delivered (Bounced).',
    dsnActionDelayed: 'Delivery is delayed, the server will keep trying.',
    dsnActionExpanded: 'The email was sent to a distribution list and forwarded to its members.',
  },
  de: {
    smtpSuccess: 'SMTP: Erfolgreich versendet',
    smtpError: 'SMTP: Fehler beim Versenden',
    smtpEmpty: 'SMTP: Keine Daten',
    smtpPending: 'SMTP: Status Unbekannt (Ausstehend)',
    dsnSuccess: 'DSN: Erfolgreich zugestellt',
    dsnError: 'DSN: Zustellfehler (Bounce)',
    dsnPending: 'DSN: Status Unbekannt (Ausstehend)',
    dsnEmpty: 'DSN: Keine Daten',
    noResults: 'Keine SMTP-Ergebnisse verfügbar.',
    details: 'Hover für Details',
    sectionTitle: 'Mail Status',
    dsnActionRelayed:
      'Die E-Mail wurde erfolgreich an den nächsten Server weitergeleitet, aber dieser sendet keine finale Zustellbestätigung zurück.',
    dsnActionDelivered: 'Die E-Mail wurde erfolgreich in das Postfach des Empfängers zugestellt.',
    dsnActionFailed: 'Die E-Mail konnte nicht zugestellt werden (Bounced).',
    dsnActionDelayed: 'Die Zustellung ist verzögert, der Server versucht es weiter.',
    dsnActionExpanded:
      'Die E-Mail wurde an eine Verteilerliste gesendet und an deren Mitglieder weitergeleitet.',
  },
  fr: {
    smtpSuccess: 'SMTP: Envoyé avec succès',
    smtpError: "SMTP: Erreur d'envoi",
    smtpEmpty: 'SMTP: Aucune donnée',
    smtpPending: 'SMTP: Statut Inconnu (En attente)',
    dsnSuccess: 'DSN: Livré avec succès',
    dsnError: 'DSN: Erreur de livraison (Rebond)',
    dsnPending: 'DSN: Statut Inconnu (En attente)',
    dsnEmpty: 'DSN: Aucune donnée',
    noResults: 'Aucun résultat SMTP disponible.',
    details: 'Survoler pour les détails',
    sectionTitle: 'Statut du Courrier',
    dsnActionRelayed:
      "L'e-mail a été transféré avec succès au serveur suivant, mais ce dernier ne renvoie pas de confirmation de livraison finale.",
    dsnActionDelivered:
      "L'e-mail a été livré avec succès dans la boîte de réception du destinataire.",
    dsnActionFailed: "L'e-mail n'a pas pu être livré (Rebondi).",
    dsnActionDelayed: 'La livraison est retardée, le serveur va réessayer.',
    dsnActionExpanded: "L'e-mail a été envoyé à une liste de diffusion et transféré à ses membres.",
  },
};

export const getSmtpTooltip = (
  stateType: 'empty' | 'pending' | 'success' | 'error',
  baseTitle: (typeof LOCALIZED_SMTP_LABELS)['en'],
  isDsn: boolean,
): string => {
  if (isDsn) {
    if (stateType === 'empty') return baseTitle.dsnEmpty;
    if (stateType === 'pending') return baseTitle.dsnPending;
    if (stateType === 'success') return baseTitle.dsnSuccess;
    return baseTitle.dsnError;
  }
  if (stateType === 'empty') return baseTitle.smtpEmpty;
  if (stateType === 'success') return baseTitle.smtpSuccess;
  if (stateType === 'pending') return baseTitle.smtpPending;
  return baseTitle.smtpError;
};

export type SmtpStatusType = 'empty' | 'pending' | 'success' | 'error';

export const SmtpBadge: React.FC<{
  prefix: string;
  type: SmtpStatusType;
  tooltip: string;
  count?: number;
}> = ({ prefix, type, tooltip, count }) => {
  const baseClasses =
    'flex items-center justify-center rounded border px-1.5 py-0.5 text-xs font-medium';
  let colorClasses =
    'border-gray-200 bg-transparent text-gray-400 dark:border-gray-700 dark:text-gray-500';

  let badgeSymbol = '-';

  switch (type) {
    case 'pending': {
      colorClasses =
        'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
      badgeSymbol = '?';
      break;
    }
    case 'success': {
      colorClasses =
        'border-green-200 bg-green-100 text-green-800 dark:border-green-800 dark:bg-green-900/40 dark:text-green-200';
      badgeSymbol = '✓';
      break;
    }
    case 'error': {
      colorClasses =
        'border-red-200 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-900/40 dark:text-red-200';
      badgeSymbol = '✗';
      break;
    }
    default: {
      break;
    }
  }

  const countPrefix = count !== undefined && count > 1 ? `${String(count)} ` : '';

  return (
    <span className={`${baseClasses} ${colorClasses}`} title={tooltip}>
      {countPrefix}
      {prefix} {badgeSymbol}
    </span>
  );
};

export const parseSmtpStats = (
  cellData: unknown,
): { smtpState: SmtpStatusType; smtpCount: number; dsnState: SmtpStatusType; dsnCount: number } => {
  let smtpSuccess = 0;
  let smtpErrors = 0;
  let dsnSuccess = 0;
  let dsnErrors = 0;

  if (Array.isArray(cellData) && cellData.length > 0) {
    for (const result of cellData) {
      if (result === null || typeof result !== 'object') continue;

      const r = result as Record<string, unknown>;
      const isBounce = r['bounceReport'] === true;
      let hasError = false;

      if (r['success'] === false) hasError = true;
      if (typeof r['error'] === 'string' && r['error'].length > 0) hasError = true;

      if (isBounce) {
        if (hasError) dsnErrors++;
        else dsnSuccess++;
      } else {
        if (hasError) smtpErrors++;
        else smtpSuccess++;
      }
    }
  }

  // Derive Box 1 (SMTP) State
  let smtpState: SmtpStatusType = 'empty';
  if (smtpErrors > 0) smtpState = 'error';
  else if (smtpSuccess > 0) smtpState = 'success';

  // Derive Box 2 (DSN) State
  let dsnState: SmtpStatusType = 'empty';
  if (dsnErrors > 0) dsnState = 'error';
  else if (dsnSuccess > 0 && dsnSuccess >= smtpSuccess) dsnState = 'success';
  else if (smtpSuccess > 0 || smtpErrors > 0) dsnState = 'pending';

  const smtpCount = smtpErrors > 0 ? smtpErrors : smtpSuccess;

  let dsnCount = 0;
  if (dsnErrors > 0) {
    dsnCount = dsnErrors;
  } else if (dsnState === 'pending') {
    dsnCount = smtpCount;
  } else {
    dsnCount = dsnSuccess;
  }

  return { smtpState, smtpCount, dsnState, dsnCount };
};

export const formatTimeDifference = (start: Date, end: Date): string => {
  const diffMs = Math.abs(end.getTime() - start.getTime());
  const diffSecs = Math.floor(diffMs / 1000);
  if (diffSecs < 60) return `${diffSecs}s`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
};
