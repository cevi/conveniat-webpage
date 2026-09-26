import type { StaticTranslationString } from '@/types/types';

/** Outcomes of the depot setup actions, rendered in the admin's language by the page. */
export const setupMessages = {
  forbidden: {
    de: 'Keine Berechtigung.',
    en: 'Not allowed.',
    fr: 'Pas autorisé.',
  },
  invalidCategory: {
    de: 'Name fehlt oder die Reihenfolge ist ungültig.',
    en: 'The name is missing or the order is invalid.',
    fr: 'Le nom manque ou l’ordre n’est pas valable.',
  },
  categorySaved: {
    de: 'Kategorie «{name}» gespeichert.',
    en: 'Category “{name}” saved.',
    fr: 'Catégorie « {name} » enregistrée.',
  },
  categoryExists: {
    de: 'Die Kategorie «{name}» gibt es schon.',
    en: 'The category “{name}” already exists.',
    fr: 'La catégorie « {name} » existe déjà.',
  },
  categoryNotEmpty: {
    de: 'Die Kategorie enthält noch {n} Artikel. Verschiebe sie zuerst.',
    en: 'The category still holds {n} items. Move them first.',
    fr: 'La catégorie contient encore {n} articles. Déplace-les d’abord.',
  },
  categoryDeleted: {
    de: 'Kategorie gelöscht.',
    en: 'Category deleted.',
    fr: 'Catégorie supprimée.',
  },
  invalidDepartment: {
    de: 'Name (mindestens 2 Zeichen) und Kürzel sind nötig.',
    en: 'A name (at least 2 characters) and a short name are required.',
    fr: 'Un nom (au moins 2 caractères) et une abréviation sont nécessaires.',
  },
  departmentSaved: {
    de: 'Abteilung «{name}» gespeichert.',
    en: 'Department “{name}” saved.',
    fr: 'Groupe « {name} » enregistré.',
  },
  departmentExists: {
    de: 'Name, Kürzel oder Cevi.DB-Gruppe gehört schon einer anderen Abteilung.',
    en: 'Name, short name or Cevi.DB group already belongs to another department.',
    fr: 'Le nom, l’abréviation ou le groupe Cevi.DB appartient déjà à un autre groupe.',
  },
  departmentHasLoans: {
    de: 'Die Abteilung hat {n} Ausleihen und bleibt deshalb bestehen.',
    en: 'The department has {n} loans and therefore stays.',
    fr: 'Le groupe a {n} prêts et reste donc en place.',
  },
  departmentDeleted: {
    de: 'Abteilung gelöscht.',
    en: 'Department deleted.',
    fr: 'Groupe supprimé.',
  },
  importEmpty: {
    de: 'Keine Zeilen gefunden.',
    en: 'No rows found.',
    fr: 'Aucune ligne trouvée.',
  },
  importTooLarge: {
    de: 'Höchstens {n} Zeilen pro Import.',
    en: 'At most {n} rows per import.',
    fr: 'Au maximum {n} lignes par import.',
  },
  importDone: {
    de: '{created} neu, {updated} aktualisiert.',
    en: '{created} new, {updated} updated.',
    fr: '{created} nouveaux, {updated} mis à jour.',
  },
  importPartial: {
    de: '{created} neu, {updated} aktualisiert, {skipped} übersprungen: {problems}',
    en: '{created} new, {updated} updated, {skipped} skipped: {problems}',
    fr: '{created} nouveaux, {updated} mis à jour, {skipped} ignorés : {problems}',
  },
  importRowInvalid: {
    de: 'Zeile {row} ({fields})',
    en: 'row {row} ({fields})',
    fr: 'ligne {row} ({fields})',
  },
  importRowBelowStock: {
    de: 'Zeile {row}: {code} braucht mindestens {n}, so viele sind ausgeliehen oder defekt',
    en: 'row {row}: {code} needs at least {n}, that many are out or broken',
    fr: 'ligne {row} : {code} nécessite au moins {n}, autant sont prêtés ou cassés',
  },
} satisfies Record<string, StaticTranslationString>;

export type SetupMessageKey = keyof typeof setupMessages;

export interface SetupResult {
  ok: boolean;
  message: SetupMessageKey;
  values?: Record<string, string | number>;
}
