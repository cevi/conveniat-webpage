import type { StaticTranslationString } from '@/types/types';

/**
 * What the forum router tells a user when it refuses a call, by reason. The router throws the
 * reason with `forumError`, the forum pages and the map translate it with `userErrorMessage`.
 * Shared, because the map reports problems through the forum too.
 */
export const forumErrorTexts = {
  forumDisabled: {
    de: 'Das Forum ist gerade ausgeschaltet. Versuche es später nochmals.',
    en: 'The forum is switched off right now. Please try again later.',
    fr: 'Le forum est désactivé pour le moment. Réessaie plus tard.',
  },
  notInTopic: {
    de: 'Du kannst in diesem Thema nicht schreiben.',
    en: 'You cannot write in this topic.',
    fr: 'Tu ne peux pas écrire dans ce thème.',
  },
  conversationsUnavailable: {
    de: 'In diesem Thema kannst du dem Kernteam nicht privat schreiben.',
    en: 'You cannot write to the core team of this topic privately.',
    fr: 'Tu ne peux pas écrire en privé à l’équipe centrale de ce thème.',
  },
  conversationClosed: {
    de: 'Dieses Gespräch ist erledigt und geschlossen. Für eine neue Frage starte ein neues.',
    en: 'This conversation is done and closed. Start a new one for a new question.',
    fr: 'Cette conversation est réglée et fermée. Pour une nouvelle question, commence-en une nouvelle.',
  },
  postGone: {
    de: 'Diesen Beitrag gibt es nicht mehr.',
    en: 'This post no longer exists.',
    fr: "Cette publication n'existe plus.",
  },
  ressortGone: {
    de: 'Diese Funktion gibt es nicht mehr. Wähle einen anderen Ressort.',
    en: 'This function no longer exists. Choose another Ressort.',
    fr: 'Cette fonction n’existe plus. Choisis un autre ressort.',
  },
  ressortEmpty: {
    de: 'Diese Funktion hat gerade niemand inne. Leite den Beitrag an eine Person weiter.',
    en: 'Nobody holds this function right now. Forward the post to a person.',
    fr: 'Personne n’occupe cette fonction pour le moment. Transfère la publication à une personne.',
  },
  protocolKernteamOnly: {
    de: 'Das Protokoll eines Themas sieht nur sein Kernteam.',
    en: 'Only the core team of a topic sees its protocol.',
    fr: 'Seule l’équipe centrale d’un thème voit son protocole.',
  },
  notInConversation: {
    de: 'Das geht in einem privaten Gespräch nicht.',
    en: 'That is not possible in a private conversation.',
    fr: 'Ce n’est pas possible dans une conversation privée.',
  },
  alreadyFlagged: {
    de: 'Du hast das schon gemeldet. Das Kernteam schaut es an.',
    en: 'You flagged this already. The core team is looking at it.',
    fr: 'Tu l’as déjà signalé. L’équipe centrale s’en occupe.',
  },
  ownMessage: {
    de: 'Deine eigenen Beiträge und Kommentare kannst du nicht melden.',
    en: 'You cannot flag your own posts and comments.',
    fr: 'Tu ne peux pas signaler tes propres publications et commentaires.',
  },
  notHidden: {
    de: 'Dieser Beitrag ist nicht mehr ausgeblendet.',
    en: 'This post is no longer hidden.',
    fr: 'Cette publication n’est plus masquée.',
  },
  editWindowOver: {
    de: 'Ändern geht nur in den ersten 24 Stunden nach dem Senden.',
    en: 'You can only change it in the first 24 hours after sending.',
    fr: 'La modification n’est possible que pendant les 24 heures qui suivent l’envoi.',
  },
  alreadyAnswered: {
    de: 'Das Kernteam hat schon reagiert. Löschen kann es jetzt nur noch die Moderation; schreib ihr, wenn es weg soll.',
    en: 'The core team has already reacted. Only the moderators can delete it now; write to them if it should go.',
    fr: 'L’équipe centrale a déjà réagi. Seule la modération peut encore la supprimer ; écris-lui si elle doit disparaître.',
  },
  topicGone: {
    de: 'Dieses Thema gibt es nicht mehr.',
    en: 'This topic no longer exists.',
    fr: 'Ce thème n’existe plus.',
  },
  authorNotInTopic: {
    de: 'Wer den Beitrag geschrieben hat, ist nicht in diesem Thema und sähe ihn nicht mehr.',
    en: 'Whoever wrote the post is not in this topic and would no longer see it.',
    fr: 'L’auteur de la publication n’est pas dans ce thème et ne la verrait plus.',
  },
  postMerged: {
    de: 'Dieser Beitrag wurde mit einem anderen zusammengeführt.',
    en: 'This post was merged into another one.',
    fr: 'Cette publication a été fusionnée avec une autre.',
  },
  notAllowed: {
    de: 'Du darfst diesen Beitrag nicht mehr bearbeiten. Deine Piket-Schicht oder dein Auftrag ist vorbei.',
    en: 'You may no longer change this post. Your shift or your assignment has ended.',
    fr: 'Tu ne peux plus modifier cette publication. Ton service de piquet ou ta mission est terminé.',
  },
  assignmentEnded: {
    de: 'Dein Auftrag für diesen Beitrag wurde zurückgezogen.',
    en: 'Your assignment for this post was withdrawn.',
    fr: 'Ta mission pour cette publication a été retirée.',
  },
  postAlreadyDone: {
    de: 'Dieser Beitrag wurde schon als erledigt gemeldet.',
    en: 'This post was already reported as done.',
    fr: 'Cette publication a déjà été signalée comme réglée.',
  },
  notAComment: {
    de: 'Dieser Kommentar gehört nicht mehr zu diesem Beitrag.',
    en: 'This comment no longer belongs to this post.',
    fr: "Ce commentaire n'appartient plus à cette publication.",
  },
  mergeIntoItself: {
    de: 'Ein Beitrag kann nur mit einem anderen Beitrag desselben Themas zusammengeführt werden.',
    en: 'A post can only be merged into another post of the same topic.',
    fr: "Une publication ne peut être fusionnée qu'avec une autre publication du même thème.",
  },
  assigneeUnknown: {
    de: 'Diese Person hat sich noch nie in der App angemeldet.',
    en: 'This person has never logged in to the app.',
    fr: "Cette personne ne s'est encore jamais connectée à l'app.",
  },
  tooManyPosts: {
    de: 'Du hast in kurzer Zeit viele Beiträge geschrieben. Versuche es in ein paar Minuten wieder.',
    en: 'You wrote many posts in a short time. Try again in a few minutes.',
    fr: 'Tu as écrit beaucoup de publications en peu de temps. Réessaie dans quelques minutes.',
  },
  tooManyChanges: {
    de: 'Du hast in kurzer Zeit sehr viel geändert. Warte einen Moment.',
    en: 'You changed a lot in a short time. Wait a moment.',
    fr: 'Tu as beaucoup modifié en peu de temps. Attends un instant.',
  },
} satisfies Record<string, StaticTranslationString>;
