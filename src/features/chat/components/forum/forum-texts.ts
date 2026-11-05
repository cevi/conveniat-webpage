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
  emptyHint: {
    de: 'Hier erscheinen Fragen, Probleme und Feedback aus dem Lager.',
    en: 'Questions, problems and feedback from the camp appear here.',
    fr: 'Les questions, problèmes et retours du camp apparaissent ici.',
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
  assignedTo: { de: 'Beauftragt', en: 'Assigned', fr: 'Mandaté' },
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
  assign: { de: 'Jemanden beauftragen', en: 'Assign someone', fr: 'Mandater quelqu’un' },
  assignSearch: { de: 'Name suchen', en: 'Search a name', fr: 'Chercher un nom' },
  assignNote: {
    de: 'Hinweis für die Person (optional)',
    en: 'Note for the person (optional)',
    fr: 'Remarque pour la personne (facultatif)',
  },
  assignAction: { de: 'Beauftragen', en: 'Assign', fr: 'Mandater' },
  withdraw: { de: 'Auftrag zurückziehen', en: 'Withdraw', fr: 'Retirer la mission' },
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
    de: 'Was ist los, seit wann?',
    en: 'What is wrong, since when?',
    fr: 'Que se passe-t-il, depuis quand ?',
  },
  photo: { de: 'Foto', en: 'Photo', fr: 'Photo' },
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
    de: 'Im Forum, für alle sichtbar. Andere können «Ich auch» sagen, die Zentrale wird benachrichtigt.',
    en: 'In the forum, visible to everyone. Others can say "me too", the Zentrale is notified.',
    fr: 'Dans le forum, visible par tous. D’autres peuvent dire « moi aussi », la Zentrale est notifiée.',
  },
  privateExplain: {
    de: 'Nur an die Zentrale, in einem Chat mit dem Piket. Für alles, was nicht öffentlich sein soll.',
    en: 'Only to the Zentrale, in a chat with the person on duty. For anything that should not be public.',
    fr: 'Seulement à la Zentrale, dans un chat avec le piquet. Pour tout ce qui ne doit pas être public.',
  },
  privateHint: {
    de: 'Nur du und das OK sehen deine Nachricht.',
    en: 'Only you and the OK see your message.',
    fr: 'Seuls toi et l’OK voyez ton message.',
  },
  sendPrivately: {
    de: 'An die Zentrale senden',
    en: 'Send to the Zentrale',
    fr: 'Envoyer à la Zentrale',
  },
  privateReport: {
    de: 'Privat an die Zentrale melden',
    en: 'Report privately to the Zentrale',
    fr: 'Signaler en privé à la Zentrale',
  },
} satisfies Record<string, StaticTranslationString>;

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

/** The time of day at the camp, Europe/Zurich, never the phone's zone. */
export const campTimeText = (date: Date, locale: Locale): string =>
  date.toLocaleTimeString(locale === 'de' ? 'de-CH' : locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Zurich',
  });
