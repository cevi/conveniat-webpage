import type { StaticTranslationString } from '@/types/types';

/**
 * What the chat routers tell a user when they refuse a call, by reason. The routers throw the
 * reason with `chatError`, and the components translate it with `userErrorMessage`. `{max}` is
 * filled in from the error's params. Shared, because other features call chat procedures too.
 */
export const chatErrorTexts = {
  messagingDisabled: {
    de: 'Nachrichten sind gerade ausgeschaltet. Versuche es später nochmals.',
    en: 'Messaging is switched off right now. Please try again later.',
    fr: 'Les messages sont désactivés pour le moment. Réessaie plus tard.',
  },
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
  threadGone: {
    de: 'Die Nachricht, auf die du im Thread antwortest, gibt es nicht mehr.',
    en: 'The message you are replying to in this thread no longer exists.',
    fr: 'Le message auquel tu réponds dans ce fil n’existe plus.',
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
} satisfies Record<string, StaticTranslationString>;
