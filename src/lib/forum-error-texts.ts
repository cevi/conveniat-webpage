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
  privateReportsUnavailable: {
    de: 'Private Meldungen sind gerade nicht möglich. Wende dich an die Zentrale.',
    en: 'Private reports are not possible right now. Please contact the Zentrale.',
    fr: 'Les signalements privés ne sont pas possibles pour le moment. Adresse-toi à la Zentrale.',
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
  privateStays: {
    de: 'Eine private Meldung bleibt im Thema für private Meldungen.',
    en: 'A private report stays in the topic for private reports.',
    fr: 'Un signalement privé reste dans le thème des signalements privés.',
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
