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
    de: 'Diese Person trägt schon ein Band. Sperre zuerst das alte.',
    en: 'This person already wears a band. Block the old one first.',
    fr: 'Cette personne porte déjà un bracelet. Bloque d’abord l’ancien.',
  },
} satisfies Record<string, StaticTranslationString>;

export type WristbandErrorReason = keyof typeof wristbandErrorTexts;
