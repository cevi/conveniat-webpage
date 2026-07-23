import type { StaticTranslationString } from '@/types/types';

export const getJoinGroupMessagePayload = (name: string): StaticTranslationString => ({
  de: `${name} ist der Gruppe beigetreten`,
  en: `${name} joined the group`,
  fr: `${name} a rejoint le groupe`,
});

export const getLeftGroupMessagePayload = (name: string): StaticTranslationString => ({
  de: `${name} hat die Gruppe verlassen`,
  en: `${name} left the group`,
  fr: `${name} a quitté le groupe`,
});

export const getJoinedAsAdminMessagePayload = (name: string): StaticTranslationString => ({
  de: `${name} ist als Admin beigetreten`,
  en: `${name} joined as admin`,
  fr: `${name} a rejoint en tant qu'administrateur`,
});
