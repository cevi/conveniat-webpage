import type { StaticTranslationString } from '@/types/types';

export const scheduleLabels = {
    admin: { de: 'Administration', en: 'Administration', fr: 'Administration' },
    participants: { de: 'Teilnehmer', en: 'Participants', fr: 'Participants' },
    createChat: {
        de: 'Gruppenchat erstellen',
        en: 'Create Group Chat',
        fr: 'Créer un chat de groupe',
    },
    editDetails: { de: 'Details bearbeiten', en: 'Edit details', fr: 'Modifier les détails' },
    save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
    cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
    enrolled: { de: 'Angemeldet', en: 'Enrolled', fr: 'Inscrit' }, // Adjusted to match previous usage
    targetGroup: { de: 'Zielgruppe', en: 'Target Group', fr: 'Groupe cible' },
    noParticipants: {
        de: 'Noch keine Teilnehmer',
        en: 'No participants yet',
        fr: 'Pas encore de participants',
    },
    enrolledBadge: { de: 'Angemeldet', en: 'Enrolled', fr: 'Inscrit' },
} as const satisfies Record<string, StaticTranslationString>;
