import type { StaticTranslationString } from '@/types/types';

/**
 * What the form submission hooks tell a user when they refuse a submission, by reason. The hooks
 * throw the reason with `formRefusal`, and the form translates it into the language of the page.
 * `{field}` is filled in from the error's params.
 */
export const formErrorTexts = {
  loginFieldRequired: {
    de: 'Das Feld «{field}» ist erforderlich. Bitte melde dich mit der Cevi.DB an.',
    en: 'The field “{field}” is required. Please log in with Cevi.DB.',
    fr: 'Le champ « {field} » est obligatoire. Connecte-toi avec la Cevi.DB.',
  },
  loginRequired: {
    de: 'Du musst angemeldet sein, um dieses Feld abzusenden.',
    en: 'You must be logged in to submit this field.',
    fr: 'Tu dois être connecté pour envoyer ce champ.',
  },
  loginMismatch: {
    de: 'Das Feld «{field}» passt nicht zu deinem angemeldeten Konto.',
    en: 'The field “{field}” does not match your logged-in account.',
    fr: 'Le champ « {field} » ne correspond pas à ton compte connecté.',
  },
  hofNotFound: {
    de: 'Der ausgewählte Hof existiert nicht.',
    en: 'The selected Hof does not exist.',
    fr: "Le Hof sélectionné n'existe pas.",
  },
  jobFull: {
    de: 'Dieser Job ist bereits voll.',
    en: 'This job is already full.',
    fr: 'Ce job est déjà complet.',
  },
  jobNotFound: {
    de: 'Ausgewählter Job nicht gefunden.',
    en: 'Selected job not found.',
    fr: 'Job sélectionné non trouvé.',
  },
} satisfies Record<string, StaticTranslationString>;
