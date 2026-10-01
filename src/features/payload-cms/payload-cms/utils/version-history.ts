import { formatUserFullName } from '@/utils/format-user-name';

/**
 * One row of a document's `_versions` collection, reduced to what the version history shows.
 */
export interface VersionEntry {
  id: string;
  /** For an autosave this is when the editing session started; Payload keeps it across saves. */
  createdAt: string;
  updatedAt: string;
  autosave: boolean;
  status: 'draft' | 'published';
  /** The locales that were live with this version, read from `_localized_status`. */
  publishedLocales: string[];
  editorName: string | undefined;
}

/** A published version together with the drafts that were saved on the way to it. */
export interface Publication {
  version: VersionEntry;
  /** Newest first. */
  drafts: VersionEntry[];
}

export interface VersionHistory {
  /** Drafts saved after the last publication, newest first. Nobody outside the admin panel sees them. */
  pending: VersionEntry[];
  /** Newest first. */
  publications: Publication[];
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

const readEditorName = (editor: unknown): string | undefined => {
  // An id instead of a document means the reader may not read users.
  if (typeof editor !== 'object' || editor === null) return undefined;
  const user = editor as Record<string, unknown>;
  return readString(formatUserFullName(readString(user['fullName']), readString(user['nickname'])));
};

const readPublishedLocales = (localizedStatus: unknown): string[] => {
  if (typeof localizedStatus !== 'object' || localizedStatus === null) return [];
  return Object.entries(localizedStatus as Record<string, unknown>)
    .filter(
      ([, status]) =>
        typeof status === 'object' &&
        status !== null &&
        (status as Record<string, unknown>)['published'] === true,
    )
    .map(([locale]) => locale);
};

/**
 * Reads a version document that was fetched with `locale: 'all'`.
 *
 * Every field of a version is optional in Payload, and versions written before a field existed
 * do not carry it, so nothing here may be assumed to be present.
 */
export const toVersionEntry = (document_: unknown): VersionEntry | undefined => {
  if (typeof document_ !== 'object' || document_ === null) return undefined;
  const raw = document_ as Record<string, unknown>;

  const id = readString(raw['id']);
  const updatedAt = readString(raw['updatedAt']);
  if (id === undefined || updatedAt === undefined) return undefined;

  const version =
    typeof raw['version'] === 'object' && raw['version'] !== null
      ? (raw['version'] as Record<string, unknown>)
      : {};

  return {
    id,
    createdAt: readString(raw['createdAt']) ?? updatedAt,
    updatedAt,
    autosave: raw['autosave'] === true,
    status: version['_status'] === 'published' ? 'published' : 'draft',
    publishedLocales: readPublishedLocales(version['_localized_status']),
    editorName: readEditorName(version['lastEditedByUser']),
  };
};

/**
 * Sorts a document's versions into what was published and the drafts in between.
 *
 * Payload stores a version per save, so one edit shows up as an autosave followed by the
 * publication of the same content. Read as a flat list, that hides which rows ever went live.
 * Here each draft is filed under the publication it led to, and drafts newer than the last
 * publication are kept apart as the changes that are not live yet.
 *
 * @param versions newest first
 */
export const groupVersionHistory = (versions: VersionEntry[]): VersionHistory => {
  const pending: VersionEntry[] = [];
  const publications: Publication[] = [];

  for (const version of versions) {
    const publication = publications.at(-1);

    if (version.status === 'published') {
      publications.push({ version, drafts: [] });
    } else if (publication === undefined) {
      pending.push(version);
    } else {
      publication.drafts.push(version);
    }
  }

  return { pending, publications };
};
