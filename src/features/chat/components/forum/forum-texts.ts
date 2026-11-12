import type { ForumPostKindValue } from '@/lib/forum-shared';
import type { Locale, StaticTranslationString } from '@/types/types';

/** The words of the forum pages. The status and capacity names live in `@/lib/forum-shared`. */
export const forumText = {
  title: { de: 'Forum', en: 'Forum', fr: 'Forum' },
  searchPlaceholder: {
    de: 'Suchen, bevor du schreibst …',
    en: 'Search before you write …',
    fr: 'Cherche avant d’écrire …',
  },
  allTopics: { de: 'Alle', en: 'All', fr: 'Tous' },
  newPost: { de: 'Neuer Beitrag', en: 'New post', fr: 'Nouvelle publication' },
  pinned: { de: 'Angeheftet', en: 'Pinned', fr: 'Épinglé' },
  newest: { de: 'Neueste', en: 'Newest', fr: 'Récentes' },
  popular: { de: 'Beliebt', en: 'Popular', fr: 'Populaires' },
  active: { de: 'Offen', en: 'Open', fr: 'Ouvertes' },
  done: { de: 'Erledigt', en: 'Done', fr: 'Réglées' },
  filterTitle: { de: 'Filter', en: 'Filter', fr: 'Filtres' },
  resetFilters: { de: 'Zurücksetzen', en: 'Reset', fr: 'Réinitialiser' },
  show: { de: 'Anzeigen', en: 'Show', fr: 'Afficher' },
  sortBy: { de: 'Sortierung', en: 'Sort by', fr: 'Tri' },
  filterAll: { de: 'Alle', en: 'All', fr: 'Toutes' },
  filterMine: { de: 'Meine', en: 'Mine', fr: 'Les miennes' },
  filterAssigned: { de: 'Meine Aufträge', en: 'My assignments', fr: 'Mes missions' },
  filterSubscribed: { de: 'Abonniert', en: 'Subscribed', fr: 'Suivies' },
  emptyTitle: { de: 'Noch keine Beiträge', en: 'No posts yet', fr: 'Pas encore de publications' },
  emptyBesidesPinnedTitle: {
    de: 'Noch keine weiteren Beiträge',
    en: 'No other posts yet',
    fr: 'Pas encore d’autres publications',
  },
  emptyHint: {
    de: 'Hier erscheinen Fragen, Probleme und Feedback aus dem Lager.',
    en: 'Questions, problems and feedback from the camp appear here.',
    fr: 'Les questions, problèmes et retours du camp apparaissent ici.',
  },
  noFilterMatch: {
    de: 'Kein Beitrag passt zu diesen Filtern.',
    en: 'No post matches these filters.',
    fr: 'Aucune publication ne correspond à ces filtres.',
  },
  resetFiltersAction: {
    de: 'Filter zurücksetzen',
    en: 'Reset filters',
    fr: 'Réinitialiser les filtres',
  },
  /** `{query}` is what was searched for */
  searchNoResult: {
    de: 'Noch kein Beitrag zu «{query}».',
    en: 'No post about “{query}” yet.',
    fr: 'Pas encore de publication sur « {query} ».',
  },
  writeAsNewPost: {
    de: 'Als neuen Beitrag schreiben',
    en: 'Write it as a new post',
    fr: 'En faire une nouvelle publication',
  },
  noTopics: {
    de: 'Noch kein Forum für dich',
    en: 'No forum for you yet',
    fr: 'Pas encore de forum pour toi',
  },
  noTopicsPrivate: {
    de: 'Etwas melden kannst du trotzdem, privat an die Zentrale.',
    en: 'You can still report something, privately to the Zentrale.',
    fr: 'Tu peux quand même signaler quelque chose, en privé à la Zentrale.',
  },
  reportToZentrale: {
    de: 'An die Zentrale melden',
    en: 'Report to the Zentrale',
    fr: 'Signaler à la Zentrale',
  },
  loadFailed: {
    de: 'Das Forum konnte nicht geladen werden',
    en: 'The forum could not be loaded',
    fr: 'Le forum n’a pas pu être chargé',
  },
  pendingPill: { de: 'Wartet auf Freigabe', en: 'Awaiting approval', fr: 'En attente' },
  filterPending: { de: 'Zur Freigabe', en: 'To approve', fr: 'À approuver' },
  filterFlagged: {
    de: 'Gemeldet oder ausgeblendet',
    en: 'Flagged or hidden',
    fr: 'Signalé ou masqué',
  },
  privatePill: { de: 'Privat', en: 'Private', fr: 'Privé' },
  privateBanner: {
    de: 'Private Meldung an die Zentrale. Nur wer sie geschrieben hat, das Kernteam und das Piket sehen sie und ihre Kommentare.',
    en: 'Private report to the Zentrale. Only its author, the core team and the person on duty see it and its comments.',
    fr: 'Signalement privé à la Zentrale. Seuls son auteur, l’équipe centrale et le piquet le voient, avec ses commentaires.',
  },
  pendingAuthor: {
    de: 'Wartet auf Freigabe. Bis das Kernteam oder das Piket den Beitrag freigibt, sehen ihn nur du und sie.',
    en: 'Awaiting approval. Until the core team or the person on duty approves it, only you and they see this post.',
    fr: 'En attente d’approbation. Tant que l’équipe centrale ou le piquet ne l’a pas approuvée, seuls toi et eux voient cette publication.',
  },
  pendingModerator: {
    de: 'Wartet auf Freigabe. Erst danach sehen ihn alle und die Abonnierten werden benachrichtigt.',
    en: 'Awaiting approval. Only then does everyone see it and subscribers are notified.',
    fr: 'En attente d’approbation. Ce n’est qu’ensuite que tout le monde la voit et que les abonnés sont notifiés.',
  },
  approve: { de: 'Freigeben', en: 'Approve', fr: 'Approuver' },
  reject: { de: 'Ablehnen', en: 'Reject', fr: 'Refuser' },
  rejectConfirm: {
    de: 'Ablehnen löscht den Beitrag. Der Text bleibt im Protokoll.',
    en: 'Rejecting deletes the post. Its text stays in the protocol.',
    fr: 'Refuser supprime la publication. Son texte reste dans le protocole.',
  },
  moderationHint: {
    de: 'Der Beitrag erscheint, sobald das Kernteam oder das Piket ihn freigegeben hat.',
    en: 'The post appears once the core team or the person on duty has approved it.',
    fr: 'La publication paraît dès que l’équipe centrale ou le piquet l’a approuvée.',
  },
  loadMore: { de: 'Mehr anzeigen', en: 'Show more', fr: 'Afficher plus' },
  kernteam: { de: 'Kernteam', en: 'Core team', fr: 'Équipe centrale' },
  subscribeTopic: {
    de: 'Neue Beiträge in diesem Thema abonnieren',
    en: 'Subscribe to new posts in this topic',
    fr: 'Suivre les nouvelles publications de ce thème',
  },
  unsubscribeTopic: {
    de: 'Neue Beiträge in diesem Thema nicht mehr abonnieren',
    en: 'Unsubscribe from new posts in this topic',
    fr: 'Ne plus suivre les nouvelles publications de ce thème',
  },
  likeAction: { de: 'Betrifft mich auch', en: 'Affects me too', fr: 'Moi aussi' },
  likeShort: { de: 'Ich auch', en: 'Me too', fr: 'Moi aussi' },
  subscribePost: {
    de: 'Kommentare und Status abonnieren',
    en: 'Subscribe to comments and status',
    fr: 'Suivre les commentaires et le statut',
  },
  unsubscribePost: {
    de: 'Kommentare und Status nicht mehr abonnieren',
    en: 'Unsubscribe from comments and status',
    fr: 'Ne plus suivre les commentaires et le statut',
  },
  onMap: { de: 'Auf der Karte', en: 'On the map', fr: 'Sur la carte' },
  answer: { de: 'Antwort', en: 'Answer', fr: 'Réponse' },
  history: { de: 'Verlauf', en: 'History', fr: 'Historique' },
  reported: { de: 'Gemeldet', en: 'Reported', fr: 'Signalé' },
  comments: { de: 'Kommentare', en: 'Comments', fr: 'Commentaires' },
  mergedInto: {
    de: 'Dieser Beitrag wurde zusammengeführt mit',
    en: 'This post was merged into',
    fr: 'Cette publication a été fusionnée avec',
  },
  yourAssignment: { de: 'Dein Auftrag', en: 'Your assignment', fr: 'Ta mission' },
  assignedTo: { de: 'Weitergeleitet an', en: 'Forwarded to', fr: 'Transféré à' },
  zentrale: { de: 'Zentrale', en: 'Zentrale', fr: 'Zentrale' },
  openZentrale: { de: 'Zentrale öffnen', en: 'Open the Zentrale', fr: 'Ouvrir la Zentrale' },
  tabWaiting: { de: 'Wartet', en: 'Waiting', fr: 'En attente' },
  tabClaimed: { de: 'Übernommen', en: 'Taken', fr: 'Pris en charge' },
  tabMine: { de: 'An mich', en: 'To me', fr: 'Pour moi' },
  tabOpen: { de: 'Alle offenen', en: 'All open', fr: 'Tous ouverts' },
  emptyWaiting: {
    de: 'Nichts wartet. Jeder offene Beitrag hat eine Reaktion.',
    en: 'Nothing is waiting. Every open post has had a reaction.',
    fr: 'Rien n’attend. Chaque publication ouverte a eu une réaction.',
  },
  emptyClaimed: {
    de: 'Gerade bearbeitet niemand einen Beitrag.',
    en: 'Nobody is handling a post right now.',
    fr: 'Personne ne traite de publication en ce moment.',
  },
  emptyMine: {
    de: 'Nichts ist an dich weitergeleitet.',
    en: 'Nothing is forwarded to you.',
    fr: 'Rien ne t’a été transféré.',
  },
  emptyOpen: {
    de: 'Keine offenen Beiträge.',
    en: 'No open posts.',
    fr: 'Aucune publication ouverte.',
  },
  pickPost: {
    de: 'Wähle links einen Beitrag.',
    en: 'Pick a post on the left.',
    fr: 'Choisis une publication à gauche.',
  },
  claim: { de: 'Ich übernehme', en: 'I’ll take it', fr: 'Je m’en charge' },
  giveBack: { de: 'Zurückgeben', en: 'Hand back', fr: 'Rendre' },
  claimedChip: { de: '{name} bearbeitet', en: '{name} is on it', fr: '{name} s’en charge' },
  claimMine: {
    de: 'Du bearbeitest das seit {time}.',
    en: 'You are on it since {time}.',
    fr: 'Tu t’en charges depuis {time}.',
  },
  claimOther: {
    de: '{name} bearbeitet das seit {time}.',
    en: '{name} is on it since {time}.',
    fr: '{name} s’en charge depuis {time}.',
  },
  forward: { de: 'Weiterleiten', en: 'Forward', fr: 'Transférer' },
  forwardedToMe: {
    de: 'An dich weitergeleitet von {by}.',
    en: 'Forwarded to you by {by}.',
    fr: 'Transféré à toi par {by}.',
  },
  forwardedToRessort: {
    de: 'An {ressort} weitergeleitet von {by}.',
    en: 'Forwarded to {ressort} by {by}.',
    fr: 'Transféré à {ressort} par {by}.',
  },
  forwardRessort: { de: 'Ressort', en: 'Ressort', fr: 'Ressort' },
  forwardPerson: { de: 'Person', en: 'Person', fr: 'Personne' },
  forwardTopic: { de: 'Thema', en: 'Topic', fr: 'Thème' },
  forwardTo: { de: 'An {name} weiterleiten', en: 'Forward to {name}', fr: 'Transférer à {name}' },
  moveTo: {
    de: 'Nach «{name}» verschieben',
    en: 'Move to "{name}"',
    fr: 'Déplacer vers « {name} »',
  },
  moveHint: {
    de: 'Der Beitrag zieht mit Kommentaren, Likes und Verlauf um. Wer ihn geschrieben hat, erfährt es.',
    en: 'The post moves with its comments, likes and history. Its author is told.',
    fr: 'La publication déménage avec ses commentaires, likes et historique. Son auteur en est informé.',
  },
  noRessorts: {
    de: 'Keine Funktion hat gerade jemand inne.',
    en: 'Nobody holds a function right now.',
    fr: 'Personne n’occupe de fonction pour le moment.',
  },
  waitingFor: { de: 'wartet {duration}', en: 'waiting {duration}', fr: 'attend depuis {duration}' },
  from: { de: 'von', en: 'from', fr: 'de' },
  reportDone: { de: 'Erledigt melden', en: 'Report as done', fr: 'Signaler comme réglé' },
  moderate: { de: 'Beitrag verwalten', en: 'Manage post', fr: 'Gérer la publication' },
  postActions: { de: 'Aktionen', en: 'Actions', fr: 'Actions' },
  status: { de: 'Status', en: 'Status', fr: 'Statut' },
  statusNote: {
    de: 'Was wurde gemacht? (optional, für alle sichtbar)',
    en: 'What was done? (optional, visible to everyone)',
    fr: 'Qu’est-ce qui a été fait ? (facultatif, visible par tous)',
  },
  saveStatus: { de: 'Status speichern', en: 'Save status', fr: 'Enregistrer le statut' },
  doneNotifies: {
    de: 'Alle, die den Beitrag abonniert haben, werden benachrichtigt.',
    en: 'Everyone who subscribed to the post is notified.',
    fr: 'Toutes les personnes qui suivent la publication sont notifiées.',
  },
  pin: { de: 'Oben anheften', en: 'Pin to the top', fr: 'Épingler en haut' },
  unpin: { de: 'Nicht mehr anheften', en: 'Unpin', fr: 'Désépingler' },
  markAnswer: { de: 'Als Antwort markieren', en: 'Mark as answer', fr: 'Marquer comme réponse' },
  unmarkAnswer: {
    de: 'Antwort nicht mehr markieren',
    en: 'Unmark the answer',
    fr: 'Ne plus marquer la réponse',
  },
  merge: {
    de: 'Mit anderem Beitrag zusammenführen',
    en: 'Merge into another post',
    fr: 'Fusionner avec une autre publication',
  },
  mergeHint: {
    de: 'Doppelte bündeln: die Likes zählen zusammen, Abonnierte folgen dem anderen Beitrag.',
    en: 'Bundle duplicates: likes count together, subscribers follow the other post.',
    fr: 'Regrouper les doublons : les likes s’additionnent, les abonnés suivent l’autre publication.',
  },
  unmerge: { de: 'Zusammenführung aufheben', en: 'Undo the merge', fr: 'Annuler la fusion' },
  searchPost: { de: 'Beitrag suchen', en: 'Search a post', fr: 'Chercher une publication' },
  assign: { de: 'Weiterleiten', en: 'Forward', fr: 'Transférer' },
  assignSearch: { de: 'Name suchen', en: 'Search a name', fr: 'Chercher un nom' },
  assignNote: {
    de: 'Hinweis (optional)',
    en: 'Note (optional)',
    fr: 'Remarque (facultatif)',
  },
  assignAction: { de: 'Weiterleiten', en: 'Forward', fr: 'Transférer' },
  withdraw: { de: 'Zurückziehen', en: 'Withdraw', fr: 'Retirer' },
  deletePost: {
    de: 'Beitrag für alle löschen',
    en: 'Delete the post for everyone',
    fr: 'Supprimer la publication pour tout le monde',
  },
  deleteConfirm: {
    de: 'Der Beitrag verschwindet für alle. Der Text bleibt im Protokoll.',
    en: 'The post disappears for everyone. Its text stays in the protocol.',
    fr: 'La publication disparaît pour tout le monde. Son texte reste dans le protocole.',
  },
  deleteYes: { de: 'Ja, löschen', en: 'Yes, delete', fr: 'Oui, supprimer' },
  cancel: { de: 'Abbrechen', en: 'Cancel', fr: 'Annuler' },
  back: { de: 'Zurück', en: 'Back', fr: 'Retour' },
  queuedOffline: {
    de: 'Gespeichert. Wird gesendet, sobald du wieder Netz hast.',
    en: 'Saved. It will be sent once you are back online.',
    fr: 'Enregistré. Envoyé dès que tu as de nouveau du réseau.',
  },
  changeFailed: {
    de: 'Das hat nicht geklappt. Versuche es nochmals.',
    en: 'That did not work. Please try again.',
    fr: 'Cela n’a pas fonctionné. Réessaie.',
  },
  // composer
  topic: { de: 'Thema', en: 'Topic', fr: 'Thème' },
  postTitle: { de: 'Titel', en: 'Title', fr: 'Titre' },
  postTitlePlaceholder: {
    de: 'z.B. Toitoi in der Mitte ist voll',
    en: 'e.g. The middle portable toilet is full',
    fr: 'p. ex. Le WC mobile du milieu est plein',
  },
  description: { de: 'Beschreibung', en: 'Description', fr: 'Description' },
  descriptionPlaceholder: {
    de: 'Was ist los, seit wann? Was hast du schon versucht?',
    en: 'What is wrong, since when? What have you tried already?',
    fr: 'Que se passe-t-il, depuis quand ? Qu’as-tu déjà essayé ?',
  },
  photo: { de: 'Foto', en: 'Photo', fr: 'Photo' },
  photoHint: {
    de: 'Am besten zwei Fotos: eines von nah, eines mit der Umgebung.',
    en: 'Two photos work best: one close up, one showing the surroundings.',
    fr: 'Idéalement deux photos : une de près, une avec les alentours.',
  },
  removePhoto: { de: 'Foto entfernen', en: 'Remove photo', fr: 'Retirer la photo' },
  location: { de: 'Standort', en: 'Location', fr: 'Emplacement' },
  addLocation: { de: 'Standort hinzufügen', en: 'Add a location', fr: 'Ajouter un emplacement' },
  changeLocation: { de: 'Ändern', en: 'Change', fr: 'Modifier' },
  removeLocation: { de: 'Standort entfernen', en: 'Remove location', fr: 'Retirer l’emplacement' },
  locationRemoved: { de: 'Standort entfernt', en: 'Location removed', fr: 'Emplacement retiré' },
  undo: { de: 'Rückgängig', en: 'Undo', fr: 'Annuler' },
  pickedSpot: { de: 'Gewählter Ort', en: 'Chosen spot', fr: 'Lieu choisi' },
  alreadyReported: {
    de: 'Gibt es schon. Betrifft es dich auch?',
    en: 'Already there. Does it affect you too?',
    fr: 'Existe déjà. Cela te concerne aussi ?',
  },
  nearbyReported: {
    de: 'Hier schon gemeldet',
    en: 'Reported here already',
    fr: 'Déjà signalé ici',
  },
  publish: { de: 'Veröffentlichen', en: 'Publish', fr: 'Publier' },
  publishHint: {
    de: 'Für alle sichtbar, mit deinem Namen.',
    en: 'Visible to everyone, with your name.',
    fr: 'Visible par tous, avec ton nom.',
  },
  publishHintKernteam: {
    de: 'Für alle sichtbar. Als Kernteam benachrichtigst du das ganze Publikum des Themas.',
    en: 'Visible to everyone. As core team, you notify the topic’s whole audience.',
    fr: 'Visible par tous. En tant qu’équipe centrale, tu notifies tout le public du thème.',
  },
  offlinePublish: {
    de: 'Zum Veröffentlichen brauchst du Netz.',
    en: 'You need a connection to publish.',
    fr: 'Il te faut du réseau pour publier.',
  },
  public: { de: 'Öffentlich', en: 'Public', fr: 'Public' },
  private: { de: 'Privat', en: 'Private', fr: 'Privé' },
  publicExplain: {
    de: 'Im Forum, für alle im Thema sichtbar. Andere können «Ich auch» sagen, das Kernteam wird benachrichtigt.',
    en: 'In the forum, visible to everyone in the topic. Others can say "me too", the core team is notified.',
    fr: 'Dans le forum, visible par tout le thème. D’autres peuvent dire « moi aussi », l’équipe centrale est notifiée.',
  },
  privateExplain: {
    de: 'Ein Gespräch nur mit dem Kernteam von «{topic}». Mitlesen können auch das Piket im Dienst und die Zentrale, sonst niemand.',
    en: 'A conversation with the core team of "{topic}" only. The piket on duty and the Zentrale can read along, nobody else.',
    fr: 'Une conversation avec l’équipe centrale de « {topic} » seulement. Le piquet de service et la Zentrale peuvent la lire, personne d’autre.',
  },
  privateHint: {
    de: 'Nur du, das Kernteam, das Piket und die Zentrale lesen das.',
    en: 'Only you, the core team, the piket and the Zentrale read this.',
    fr: 'Seuls toi, l’équipe centrale, le piquet et la Zentrale lisez ceci.',
  },
  sendPrivately: {
    de: 'Privat ans Kernteam senden',
    en: 'Send privately to the core team',
    fr: 'Envoyer en privé à l’équipe centrale',
  },
  privateReport: {
    de: 'Kernteam privat schreiben',
    en: 'Write the core team privately',
    fr: 'Écrire en privé à l’équipe centrale',
  },
  noPrivateTopic: {
    de: 'Kein Thema nimmt gerade private Gespräche an.',
    en: 'No topic takes private conversations right now.',
    fr: 'Aucun thème n’accepte de conversations privées pour le moment.',
  },
  kind: { de: 'Art', en: 'Kind', fr: 'Type' },
  answered: { de: 'Beantwortet', en: 'Answered', fr: 'Répondu' },
  unanswered: { de: 'Unbeantwortet', en: 'Unanswered', fr: 'Sans réponse' },
  hiddenPill: { de: 'Ausgeblendet', en: 'Hidden', fr: 'Masqué' },
  flagsPill: { de: '{n} Meldungen', en: '{n} flags', fr: '{n} signalements' },
  conversationBanner: {
    de: 'Privates Gespräch mit dem Kernteam von «{topic}». Nur du, das Kernteam, das Piket im Dienst und die Zentrale lesen es.',
    en: 'Private conversation with the core team of "{topic}". Only you, the core team, the piket on duty and the Zentrale read it.',
    fr: 'Conversation privée avec l’équipe centrale de « {topic} ». Seuls toi, l’équipe centrale, le piquet de service et la Zentrale la lisent.',
  },
  conversationClosed: {
    de: 'Erledigt und geschlossen. Für eine neue Frage starte ein neues Gespräch.',
    en: 'Done and closed. Start a new conversation for a new question.',
    fr: 'Réglée et fermée. Pour une nouvelle question, commence une nouvelle conversation.',
  },
  yourConversations: { de: 'Deine Gespräche', en: 'Your conversations', fr: 'Tes conversations' },
  topics: { de: 'Themen', en: 'Topics', fr: 'Thèmes' },
  openCount: { de: '{n} offen', en: '{n} open', fr: '{n} ouverts' },
  closedConversation: { de: 'Geschlossen', en: 'Closed', fr: 'Fermée' },
  todo: { de: 'Zu tun', en: 'To do', fr: 'À faire' },
  introContinue: { de: 'Los geht’s', en: 'Let’s go', fr: 'C’est parti' },
  howItWorks: { de: 'So funktioniert’s', en: 'How it works', fr: 'Comment ça marche' },
  protocol: { de: 'Protokoll', en: 'Protocol', fr: 'Protocole' },
  topicSettings: { de: 'Einstellungen des Themas', en: 'Topic settings', fr: 'Réglages du thème' },
  conversationPush: {
    de: 'Push für neue private Gespräche',
    en: 'Push for new private conversations',
    fr: 'Push pour les nouvelles conversations privées',
  },
  conversationPushExplain: {
    de: 'Als Kernteam bist du in jedem privaten Gespräch dieses Themas. Aus, beginnen neue stumm.',
    en: 'As core team you are in every private conversation of this topic. Off, new ones start muted.',
    fr: 'En tant qu’équipe centrale, tu es dans chaque conversation privée de ce thème. Désactivé, les nouvelles commencent en sourdine.',
  },
  newPostsPush: {
    de: 'Push für neue Beiträge',
    en: 'Push for new posts',
    fr: 'Push pour les nouvelles publications',
  },
  flag: { de: 'Melden', en: 'Flag', fr: 'Signaler' },
  flagTitle: { de: 'Beitrag melden', en: 'Flag post', fr: 'Signaler la publication' },
  flagCommentTitle: { de: 'Kommentar melden', en: 'Flag comment', fr: 'Signaler le commentaire' },
  flagExplain: {
    de: 'Das Kernteam von «{topic}» schaut es an. Nur es sieht, wer gemeldet hat.',
    en: 'The core team of "{topic}" looks at it. Only they see who flagged it.',
    fr: 'L’équipe centrale de « {topic} » s’en occupe. Elle seule voit qui a signalé.',
  },
  flagEmergency: {
    de: 'Bei einem Notfall nicht melden, sondern den Notfall-Tab nutzen.',
    en: 'In an emergency, do not flag: use the emergency tab.',
    fr: 'En cas d’urgence, ne signale pas : utilise l’onglet urgence.',
  },
  flagNote: {
    de: 'Was stimmt nicht? (optional)',
    en: 'What is wrong? (optional)',
    fr: 'Qu’est-ce qui ne va pas ? (facultatif)',
  },
  flagged: {
    de: 'Gemeldet. Danke, das Kernteam schaut es an.',
    en: 'Flagged. Thank you, the core team is looking at it.',
    fr: 'Signalé. Merci, l’équipe centrale s’en occupe.',
  },
  youFlagged: {
    de: 'Du hast das gemeldet: {reason}',
    en: 'You flagged this: {reason}',
    fr: 'Tu as signalé ceci : {reason}',
  },
  hide: { de: 'Ausblenden', en: 'Hide', fr: 'Masquer' },
  hideExplain: {
    de: 'Nur wer es geschrieben hat und die Moderation sehen es noch. Die Person erfährt den Grund und kann es überarbeiten.',
    en: 'Only its author and the moderators still see it. The author reads the reason and can revise it.',
    fr: 'Seuls son auteur et la modération le voient encore. L’auteur lit la raison et peut le modifier.',
  },
  removeDelete: { de: 'Löschen', en: 'Delete', fr: 'Supprimer' },
  removeDeleteExplain: {
    de: 'Für alle weg, auch für die Person, die es schrieb. Sie erfährt den Grund. Der Text bleibt im Protokoll.',
    en: 'Gone for everyone, its author included. The author reads the reason. The text stays in the protocol.',
    fr: 'Disparu pour tous, son auteur compris. L’auteur lit la raison. Le texte reste dans le protocole.',
  },
  reason: { de: 'Grund', en: 'Reason', fr: 'Raison' },
  reasonNote: {
    de: 'Nachricht an die Person (optional)',
    en: 'Message to the author (optional)',
    fr: 'Message à l’auteur (facultatif)',
  },
  restore: { de: 'Wieder einblenden', en: 'Show again', fr: 'Réafficher' },
  dismissFlags: { de: 'Meldungen verwerfen', en: 'Dismiss flags', fr: 'Rejeter les signalements' },
  changeKind: { de: 'Art ändern', en: 'Change kind', fr: 'Changer le type' },
  removedByModeration: {
    de: 'Von der Moderation entfernt',
    en: 'Removed by the moderators',
    fr: 'Retiré par la modération',
  },
  hiddenForAuthor: {
    de: 'Ausgeblendet, bis du ihn überarbeitest',
    en: 'Hidden until you revise it',
    fr: 'Masqué jusqu’à ce que tu le modifies',
  },
  hiddenForModerator: {
    de: 'Ausgeblendet. Andere sehen nur einen Hinweis.',
    en: 'Hidden. Others only see a notice.',
    fr: 'Masqué. Les autres ne voient qu’un avis.',
  },
  hiddenForOthers: {
    de: 'Von der Moderation ausgeblendet.',
    en: 'Hidden by the moderators.',
    fr: 'Masqué par la modération.',
  },
  reviewRequested: {
    de: 'Überarbeitet, wartet auf die Prüfung.',
    en: 'Revised, waiting for review.',
    fr: 'Modifié, en attente de vérification.',
  },
  requestReview: {
    de: 'Erneut prüfen lassen',
    en: 'Ask for a review',
    fr: 'Demander une vérification',
  },
  revise: { de: 'Überarbeiten', en: 'Revise', fr: 'Modifier' },
  edit: { de: 'Bearbeiten', en: 'Edit', fr: 'Modifier' },
  editPost: { de: 'Beitrag bearbeiten', en: 'Edit post', fr: 'Modifier la publication' },
  edited: { de: 'Bearbeitet', en: 'Edited', fr: 'Modifié' },
  save: { de: 'Speichern', en: 'Save', fr: 'Enregistrer' },
  deleteOwn: { de: 'Beitrag löschen', en: 'Delete post', fr: 'Supprimer la publication' },
  deleteOwnConfirm: {
    de: 'Der Beitrag und seine Kommentare verschwinden für alle.',
    en: 'The post and its comments disappear for everyone.',
    fr: 'La publication et ses commentaires disparaissent pour tous.',
  },
  deleteOwnLocked: {
    de: 'Das Kernteam hat schon reagiert. Löschen kann es nur noch die Moderation.',
    en: 'The core team has already reacted. Only the moderators can delete it now.',
    fr: 'L’équipe centrale a déjà réagi. Seule la modération peut encore la supprimer.',
  },
} satisfies Record<string, StaticTranslationString>;

/** What each kind of post is for, under the composer's choice. */
export const forumKindExplain: Record<ForumPostKindValue, StaticTranslationString> = {
  QUESTION: {
    de: 'Du möchtest etwas wissen. Das Kernteam markiert die Antwort.',
    en: 'You want to know something. The core team marks the answer.',
    fr: 'Tu veux savoir quelque chose. L’équipe centrale marque la réponse.',
  },
  PROBLEM: {
    de: 'Etwas ist kaputt, fehlt oder stört. Es wird bearbeitet und erledigt.',
    en: 'Something is broken, missing or in the way. It gets worked on and done.',
    fr: 'Quelque chose est cassé, manque ou gêne. C’est traité puis réglé.',
  },
  IDEA: {
    de: 'Ein Vorschlag. Andere sagen mit «Gute Idee», was sie davon halten.',
    en: 'A suggestion. Others say with "Good idea" what they think of it.',
    fr: 'Une proposition. Les autres disent avec « Bonne idée » ce qu’ils en pensent.',
  },
};

/** "vor 5 Min." and the like, relative to now; older than a day shows the date. */
export const relativeTimeText = (date: Date, locale: Locale, now: Date = new Date()): string => {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
  if (minutes < 60) return formatter.format(-Math.max(minutes, 0), 'minute');
  if (minutes < 24 * 60) return formatter.format(-Math.round(minutes / 60), 'hour');
  return date.toLocaleDateString(locale === 'de' ? 'de-CH' : locale, {
    day: 'numeric',
    month: 'short',
    timeZone: 'Europe/Zurich',
  });
};

/** How long something has waited, e.g. "3 Std", for the Zentrale's queue. */
export const durationText = (since: Date, locale: Locale, now: Date = new Date()): string => {
  const minutes = Math.max(Math.round((now.getTime() - since.getTime()) / 60_000), 0);
  const unit = (value: number, kind: 'minute' | 'hour' | 'day'): string =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: kind, unitDisplay: 'short' }).format(
      value,
    );
  if (minutes < 60) return unit(minutes, 'minute');
  if (minutes < 24 * 60) return unit(Math.round(minutes / 60), 'hour');
  return unit(Math.round(minutes / (24 * 60)), 'day');
};

/** The time of day at the camp, Europe/Zurich, never the phone's zone. */
export const campTimeText = (date: Date, locale: Locale): string =>
  date.toLocaleTimeString(locale === 'de' ? 'de-CH' : locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
