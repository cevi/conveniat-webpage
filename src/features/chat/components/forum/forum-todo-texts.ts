import type { ForumAuditAction } from '@/lib/prisma/enums';
import type { StaticTranslationString } from '@/types/types';

/** The words of "Zu tun" and of a topic's protocol in the app. */
export const forumTodoText = {
  scopeMine: { de: 'Meine Themen', en: 'My topics', fr: 'Mes thèmes' },
  scopeAll: { de: 'Alle', en: 'All', fr: 'Tous' },
  sectionFlagged: { de: 'Gemeldet', en: 'Flagged', fr: 'Signalé' },
  sectionConversations: {
    de: 'Private Gespräche',
    en: 'Private conversations',
    fr: 'Conversations privées',
  },
  sectionWaiting: {
    de: 'Wartet auf Antwort',
    en: 'Waiting for an answer',
    fr: 'Attend une réponse',
  },
  sectionMine: { de: 'An dich weitergeleitet', en: 'Forwarded to you', fr: 'Transmis à toi' },
  nothing: { de: 'Nichts', en: 'Nothing', fr: 'Rien' },
  nothingToDo: { de: 'Nichts zu tun', en: 'Nothing to do', fr: 'Rien à faire' },
  nothingToDoDescription: {
    de: 'Keine Meldungen, keine offenen Gespräche und nichts, das auf eine Antwort wartet.',
    en: 'No flags, no open conversations and nothing waiting for an answer.',
    fr: 'Aucun signalement, aucune conversation ouverte et rien qui attend une réponse.',
  },
  flagCount: { de: '{n} Meldungen', en: '{n} flags', fr: '{n} signalements' },
  flagCountOne: { de: '1 Meldung', en: '1 flag', fr: '1 signalement' },
  reviewRequested: {
    de: 'Überarbeitet, bitte prüfen',
    en: 'Revised, please review',
    fr: 'Révisé, à vérifier',
  },
  hidden: { de: 'ausgeblendet', en: 'hidden', fr: 'masqué' },
  privateConversation: { de: 'Privat', en: 'Private', fr: 'Privé' },
  protocol: { de: 'Protokoll', en: 'Protocol', fr: 'Protocole' },
  automaticHide: {
    de: 'Automatisch ausgeblendet nach {n} Meldungen',
    en: 'Hidden automatically after {n} flags',
    fr: 'Masqué automatiquement après {n} signalements',
  },
  protocolEmpty: {
    de: 'Noch nichts protokolliert',
    en: 'Nothing logged yet',
    fr: 'Rien de consigné pour l’instant',
  },
  protocolEmptyDescription: {
    de: 'Hier steht jede Änderung an einem Beitrag, die nicht von der Person selbst stammt.',
    en: 'Every change to a post not made by its author shows up here.',
    fr: 'Chaque modification d’une publication qui ne vient pas de son auteur apparaît ici.',
  },
  today: { de: 'Heute', en: 'Today', fr: 'Aujourd’hui' },
  yesterday: { de: 'Gestern', en: 'Yesterday', fr: 'Hier' },
  delegatedBy: { de: 'beauftragt von {name}', en: 'assigned by {name}', fr: 'mandaté par {name}' },
  conversation: {
    de: 'Privates Gespräch',
    en: 'Private conversation',
    fr: 'Conversation privée',
  },
} satisfies Record<string, StaticTranslationString>;

/** What someone did, after their name: "Lea (Kernteam) blendete aus". */
export const forumProtocolVerb: Record<ForumAuditAction, StaticTranslationString> = {
  STATUS_CHANGED: { de: 'änderte den Status', en: 'changed the status', fr: 'a changé le statut' },
  PINNED: { de: 'heftete an', en: 'pinned', fr: 'a épinglé' },
  UNPINNED: { de: 'löste die Anheftung', en: 'unpinned', fr: 'a désépinglé' },
  ANSWER_MARKED: {
    de: 'markierte eine Antwort',
    en: 'marked an answer',
    fr: 'a marqué une réponse',
  },
  ANSWER_UNMARKED: {
    de: 'entfernte die Antwort-Markierung',
    en: 'unmarked the answer',
    fr: 'a retiré la réponse marquée',
  },
  MERGED: { de: 'führte zusammen', en: 'merged', fr: 'a fusionné' },
  UNMERGED: { de: 'hob die Zusammenführung auf', en: 'unmerged', fr: 'a annulé la fusion' },
  DELETED: { de: 'löschte', en: 'deleted', fr: 'a supprimé' },
  ASSIGNED: { de: 'leitete weiter', en: 'forwarded', fr: 'a transmis' },
  ASSIGNMENT_ENDED: {
    de: 'zog einen Auftrag zurück',
    en: 'withdrew an assignment',
    fr: 'a retiré un mandat',
  },
  MOVED: { de: 'verschob', en: 'moved', fr: 'a déplacé' },
  APPROVED: { de: 'gab frei', en: 'approved', fr: 'a approuvé' },
  HIDDEN: { de: 'blendete aus', en: 'hid', fr: 'a masqué' },
  RESTORED: { de: 'blendete wieder ein', en: 'showed again', fr: 'a réaffiché' },
  FLAGS_DISMISSED: {
    de: 'verwarf die Meldungen',
    en: 'dismissed the flags',
    fr: 'a rejeté les signalements',
  },
  KIND_CHANGED: { de: 'änderte die Art', en: 'changed the kind', fr: 'a changé le type' },
};
