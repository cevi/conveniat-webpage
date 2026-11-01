import type { StaticTranslationString } from '@/types/types';

/** The words of "Erinnern": the button, the push it sends and its setting. */
export const reminderLabels = {
  remind: { de: 'Erinnern', en: 'Remind me', fr: 'Me rappeler' },
  reminderOn: { de: 'Erinnerung an', en: 'Reminder on', fr: 'Rappel activé' },
  startsIn: {
    de: 'Startet in {{duration}}',
    en: 'Starts in {{duration}}',
    fr: 'Commence dans {{duration}}',
  },
  showWay: { de: 'Weg anzeigen', en: 'Show the way', fr: 'Montrer le chemin' },
  pushOff: {
    de: 'Push-Benachrichtigungen sind aus, die Erinnerung kommt so nicht an.',
    en: 'Push notifications are off, so the reminder will not arrive.',
    fr: "Les notifications push sont désactivées, le rappel n'arrivera pas.",
  },
  pushOffLink: {
    de: 'Einschalten',
    en: 'Turn on',
    fr: 'Activer',
  },
  failed: {
    de: 'Konnte nicht gespeichert werden. Versuche es nochmals.',
    en: 'Could not be saved. Try again.',
    fr: "N'a pas pu être enregistré. Réessaie.",
  },
  removeReminderTooQuestion: {
    de: 'Erinnerung auch entfernen?',
    en: 'Remove the reminder too?',
    fr: 'Supprimer aussi le rappel ?',
  },
  removeReminderTooDescription: {
    de: 'Für diesen Block ist eine Erinnerung gesetzt.',
    en: 'This block has a reminder set.',
    fr: 'Un rappel est réglé pour ce bloc.',
  },
  yesRemove: { de: 'Ja, entfernen', en: 'Yes, remove', fr: 'Oui, supprimer' },
  keep: { de: 'Behalten', en: 'Keep', fr: 'Garder' },
  pushLead: {
    de: '{{title}} beginnt in {{minutes}} min',
    en: '{{title}} starts in {{minutes}} min',
    fr: '{{title}} commence dans {{minutes}} min',
  },
  pushStart: {
    de: '{{title}} beginnt jetzt',
    en: '{{title}} starts now',
    fr: '{{title}} commence maintenant',
  },
} as const satisfies Record<string, StaticTranslationString>;
