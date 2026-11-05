import type { StaticTranslationString } from '@/types/types';

/**
 * What `castVotes` tells a participant when it refuses a vote, by reason. The router throws the
 * reason with `photoContestError`, and the contest view translates it with `userErrorMessage`.
 * Each can follow from a page loaded before an editor changed the contest.
 */
export const photoContestErrorTexts = {
  contestNotFound: {
    de: 'Diesen Fotowettbewerb gibt es nicht mehr.',
    en: 'This photo contest no longer exists.',
    fr: "Ce concours photo n'existe plus.",
  },
  votingNotActive: {
    de: 'Abstimmung für diesen Wettbewerb ist aktuell nicht aktiv.',
    en: 'Voting for this contest is not open right now.',
    fr: "Le vote pour ce concours n'est pas ouvert pour le moment.",
  },
  votingNotStarted: {
    de: 'Die Abstimmung hat noch nicht begonnen.',
    en: 'Voting has not started yet.',
    fr: "Le vote n'a pas encore commencé.",
  },
  votingEnded: {
    de: 'Die Abstimmung ist bereits beendet.',
    en: 'Voting has already ended.',
    fr: 'Le vote est déjà terminé.',
  },
  imageNotInContest: {
    de: 'Ein oder mehrere ausgewählte Bilder gehören nicht zu diesem Wettbewerb.',
    en: 'One or more of the chosen images are not part of this contest.',
    fr: 'Une ou plusieurs des images choisies ne font pas partie de ce concours.',
  },
  tooManyPoints: {
    de: 'Du darfst insgesamt maximal {max} Punkte vergeben.',
    en: 'You can give at most {max} points in total.',
    fr: 'Tu peux attribuer au plus {max} points au total.',
  },
  tooManyPointsPerImage: {
    de: 'Pro Bild dürfen maximal {max} Punkte vergeben werden.',
    en: 'An image can get at most {max} points.',
    fr: 'Une image peut recevoir au plus {max} points.',
  },
} satisfies Record<string, StaticTranslationString>;
