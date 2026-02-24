import type { StaticTranslationString } from '@/types/types';

export const DSN_TIMEOUT_MS = 48 * 60 * 60 * 1000; // 48 hours

export const LOCALIZED_SMTP_LABELS = {
  en: {
    smtpSuccess: 'SMTP: Sent Successfully',
    smtpError: 'SMTP: Failed to send',
    smtpEmpty: 'SMTP: No data',
    smtpPending: 'SMTP: Unknown Status (Pending)',
    dsnSuccess: 'DSN: Delivered Successfully',
    dsnError: 'DSN: Delivery Error (Bounce)',
    dsnPending: 'DSN: Unknown Status (Pending)',
    dsnEmpty: 'DSN: No data',
    noResults: 'No SMTP results available.',
    details: 'Hover for details',
    sectionTitle: 'Mail Status',
    rawSmtpResults: 'Raw SMTP Results',
    noData: 'No data',
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
    dsnPending: 'DSN: Unbekannter Status (Ausstehend)',
    dsnEmpty: 'DSN: Keine Daten',
    noResults: 'Keine SMTP-Ergebnisse verfügbar.',
    details: 'Schweben für Details',
    sectionTitle: 'Mail Status',
    rawSmtpResults: 'Raw SMTP Results',
    noData: 'Keine Daten',
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
    rawSmtpResults: 'Résultats SMTP Bruts',
    noData: 'Aucune donnée',
    dsnActionRelayed:
      "L'e-mail a été transféré avec succès au serveur suivant, mais ce dernier ne renvoie pas de confirmation de livraison finale.",
    dsnActionDelivered:
      "L'e-mail a été livré avec succès dans la boîte de réception du destinataire.",
    dsnActionFailed: "L'e-mail n'a pas pu être livré (Rebondi).",
    dsnActionDelayed: 'La livraison est retardée, le serveur va réessayer.',
    dsnActionExpanded: "L'e-mail a été envoyé à une liste de diffusion et transféré à ses membres.",
  },
};

export const WARNING_MESSAGES: StaticTranslationString = {
  en: "Warning: Sender is '{fromAddress}' instead of @{smtpDomain}.",
  de: "Warnung: Absender ist '{fromAddress}' anstelle von @{smtpDomain}.",
  fr: "Attention: L'expéditeur est '{fromAddress}' au lieu de @{smtpDomain}.",
};
