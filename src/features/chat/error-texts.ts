import type { StaticTranslationString } from '@/types/types';

/**
 * What the chat routers tell a user when they refuse a call, by reason. The routers throw the
 * reason with `chatError`, and the components translate it with `userErrorMessage`. `{max}` is
 * filled in from the error's params.
 */
export const chatErrorTexts = {
  chatNameTooLong: {
    de: 'Der Chat-Name darf höchstens {max} Zeichen lang sein.',
    en: 'The chat name may be at most {max} characters long.',
    fr: 'Le nom du chat ne doit pas dépasser {max} caractères.',
  },
  groupTooLarge: {
    de: 'Eine Gruppe hat höchstens {max} Mitglieder.',
    en: 'A group can have at most {max} members.',
    fr: 'Un groupe compte au plus {max} membres.',
  },
  tooManyReactions: {
    de: 'Du kannst auf eine Nachricht mit höchstens {max} verschiedenen Emojis reagieren.',
    en: 'You can react to a message with at most {max} different emojis.',
    fr: 'Tu peux réagir à un message avec au plus {max} emojis différents.',
  },
  privateChat: {
    de: 'In einen privaten Chat kann niemand hinzugefügt werden. Erstelle stattdessen eine Gruppe.',
    en: 'Nobody can be added to a private chat. Create a group instead.',
    fr: 'Personne ne peut être ajouté à un chat privé. Crée plutôt un groupe.',
  },
  notAContact: {
    de: 'Du kannst nur mit deinen Kontakten einen Chat starten.',
    en: 'You can only start a chat with your contacts.',
    fr: 'Tu ne peux démarrer un chat qu’avec tes contacts.',
  },
  tooManyMessages: {
    de: 'Du sendest zu viele Nachrichten. Warte einen Moment, sie werden danach gesendet.',
    en: 'You are sending too many messages. Wait a moment, they will be sent afterwards.',
    fr: 'Tu envoies trop de messages. Attends un instant, ils seront envoyés ensuite.',
  },
  tooManyChats: {
    de: 'Du hast in kurzer Zeit zu viele Chats erstellt. Versuche es in ein paar Minuten wieder.',
    en: 'You created too many chats in a short time. Try again in a few minutes.',
    fr: 'Tu as créé trop de chats en peu de temps. Réessaie dans quelques minutes.',
  },
  tooManyInvites: {
    de: 'Du hast in kurzer Zeit zu viele QR-Codes erstellt. Versuche es in ein paar Minuten wieder.',
    en: 'You created too many QR codes in a short time. Try again in a few minutes.',
    fr: 'Tu as créé trop de codes QR en peu de temps. Réessaie dans quelques minutes.',
  },
  tooManyReports: {
    de: 'Du hast gerade mehrere Probleme gemeldet. Schreib weitere Details in einen der offenen Chats oder versuche es in ein paar Minuten wieder.',
    en: 'You just reported several problems. Add further details in one of the open chats or try again in a few minutes.',
    fr: "Tu viens de signaler plusieurs problèmes. Ajoute d'autres détails dans l'un des chats ouverts ou réessaie dans quelques minutes.",
  },
} satisfies Record<string, StaticTranslationString>;
