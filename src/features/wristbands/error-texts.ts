import type { StaticTranslationString } from '@/types/types';

/**
 * What the wristband router tells an AVP when it refuses to hand out or take back a band, by
 * reason. The service throws the reason with `wristbandError`, the page translates it with
 * `userErrorMessage`.
 */
export const wristbandErrorTexts = {
  bandUnknown: {
    de: 'Dieses Band ist nicht programmiert.',
    en: 'This band has not been programmed.',
    fr: 'Ce bracelet n’est pas programmé.',
  },
  bandOfOtherHof: {
    de: 'Dieses Band gehört einem anderen Hof.',
    en: 'This band belongs to another Hof.',
    fr: 'Ce bracelet appartient à un autre Hof.',
  },
  bandRevoked: {
    de: 'Dieses Band ist gesperrt.',
    en: 'This band is blocked.',
    fr: 'Ce bracelet est bloqué.',
  },
  registrationNotInHof: {
    de: 'Diese Person ist nicht mehr in deinem Hof angemeldet.',
    en: 'This person is no longer registered with your Hof.',
    fr: 'Cette personne n’est plus inscrite dans ton Hof.',
  },
  personHasBand: {
    de: 'Diese Person hat inzwischen ein Band bekommen, wohl an einer anderen Station.',
    en: 'This person got a band in the meantime, probably at another station.',
    fr: 'Cette personne a reçu un bracelet entre-temps, sans doute à un autre poste.',
  },
  bandWornByOther: {
    de: 'Dieses Band trägt schon jemand anders aus deinem Hof. Nimm ein anderes.',
    en: 'Someone else of your Hof already wears this band. Take another one.',
    fr: 'Quelqu’un d’autre de ton Hof porte déjà ce bracelet. Prends-en un autre.',
  },
  notYourHof: {
    de: 'Du vergibst die Bänder dieses Hofs nicht mehr.',
    en: 'You no longer hand out the bands of this Hof.',
    fr: 'Tu ne remets plus les bracelets de ce Hof.',
  },
  helperWithoutLogin: {
    de: 'Diese Person hat kein Cevi.DB-Login und kann darum nicht helfen.',
    en: 'This person has no Cevi.DB login and so cannot help.',
    fr: 'Cette personne n’a pas de login Cevi.DB et ne peut donc pas aider.',
  },
  notHofAvp: {
    de: 'Nur die AVP des Hofs bestimmt, wer hilft.',
    en: 'Only the AVP of the Hof decides who helps.',
    fr: 'Seule l’AVP du Hof décide qui aide.',
  },
  tooManyReads: {
    de: 'Du hast in kurzer Zeit zu viele Armbänder geöffnet. Versuche es in ein paar Minuten wieder.',
    en: 'You opened too many wristbands in a short time. Try again in a few minutes.',
    fr: 'Tu as ouvert trop de bracelets en peu de temps. Réessaie dans quelques minutes.',
  },
} satisfies Record<string, StaticTranslationString>;

export type WristbandErrorReason = keyof typeof wristbandErrorTexts;
