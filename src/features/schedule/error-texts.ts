import type { StaticTranslationString } from '@/types/types';

/**
 * What the schedule routers tell a participant when they refuse an enrolment or an edit, by
 * reason. The routers throw the reason with `scheduleError`, and the components translate it
 * with `userErrorMessage`. A `timeConflict` also carries the `kind` and `id` of the block in the
 * way, which the enrolment opens its switch dialog with.
 */
export const scheduleErrorTexts = {
  workshopEnrolmentClosed: {
    de: 'Für diesen Workshop ist die Einschreibung nicht offen.',
    en: 'Enrolment is not open for this workshop.',
    fr: 'Les inscriptions ne sont pas ouvertes pour cet atelier.',
  },
  workshopFull: {
    de: 'Dieser Workshop ist bereits ausgebucht.',
    en: 'This workshop is already fully booked.',
    fr: 'Cet atelier est déjà complet.',
  },
  shiftEnrolmentClosed: {
    de: 'Für diesen Schichteinsatz ist die Einschreibung nicht offen.',
    en: 'Enrolment is not open for this shift.',
    fr: 'Les inscriptions ne sont pas ouvertes pour ce service.',
  },
  shiftFull: {
    de: 'Dieser Schichteinsatz ist bereits ausgebucht.',
    en: 'This shift is already fully booked.',
    fr: 'Ce service est déjà complet.',
  },
  notEnrolledInSource: {
    de: 'Du bist für den Block, von dem du wechseln willst, nicht mehr angemeldet.',
    en: 'You are no longer enrolled in the block you want to switch from.',
    fr: 'Tu n’es plus inscrit au bloc que tu veux quitter.',
  },
  timeConflict: {
    de: 'Zeitkonflikt mit «{title}».',
    en: 'Time conflict with “{title}”.',
    fr: 'Conflit horaire avec « {title} ».',
  },
  unenrollmentDeadlinePassed: {
    de: 'Die Abmeldefrist ist abgelaufen.',
    en: 'The withdrawal deadline has passed.',
    fr: 'Le délai de désinscription est écoulé.',
  },
  onlyOrganisersEdit: {
    de: 'Nur Organisatoren können die Angaben ändern.',
    en: 'Only organisers can change the details.',
    fr: 'Seuls les organisateurs peuvent modifier les informations.',
  },
  maxBelowEnrolled: {
    de: 'Die maximale Anzahl Teilnehmende darf nicht unter der Zahl der Angemeldeten liegen.',
    en: 'The maximum number of participants cannot be lower than the number already enrolled.',
    fr: 'Le nombre maximum de participants ne peut pas être inférieur au nombre d’inscrits.',
  },
  hofChoiceRequired: {
    de: 'Wähle, für welchen deiner Höfe dieser Schichteinsatz zählt.',
    en: 'Choose which of your Höfe this shift counts for.',
    fr: 'Choisis pour lequel de tes Höfe ce service compte.',
  },
  notInThisHof: {
    de: 'Du bist nicht (mehr) in diesem Hof angemeldet. Lade die Seite neu und wähle nochmals.',
    en: 'You are not (or no longer) registered in this Hof. Reload the page and choose again.',
    fr: 'Tu n’es pas (ou plus) inscrit dans ce Hof. Recharge la page et choisis à nouveau.',
  },
  onlyOrganisersChat: {
    de: 'Nur Organisatoren können den Gruppenchat erstellen.',
    en: 'Only organisers can create the group chat.',
    fr: 'Seuls les organisateurs peuvent créer le chat de groupe.',
  },
} satisfies Record<string, StaticTranslationString>;
