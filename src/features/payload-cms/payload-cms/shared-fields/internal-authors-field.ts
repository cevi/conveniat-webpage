import type { Field, PayloadRequest, TypedUser } from 'payload';

/**
 * Extracts the ids of the currently assigned authors, independent of whether the
 * relationship was handed to us as ids or as populated user documents.
 */
const toAuthorIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((author: unknown): string[] => {
    if (typeof author === 'string') return [author];
    if (typeof author === 'object' && author !== null && 'id' in author) {
      const { id } = author;
      return typeof id === 'string' ? [id] : [];
    }
    return [];
  });
};

export const internalAuthorsField: Field = {
  name: 'authors',
  label: {
    en: 'Authors',
    de: 'Autoren',
    fr: 'Auteurs',
  },
  admin: {
    description: {
      en: 'Authors of the Page (internal use only)',
      de: 'Autoren der Seite (nur intern)',
      fr: 'Auteurs de la page (seulement pour un usage interne)',
    },
    position: 'sidebar',
  },
  type: 'relationship',
  relationTo: 'users',
  hasMany: true,
  required: false,

  // pre-fills the field in the admin panel when a new document is created
  defaultValue: ({ user }: { user: TypedUser | null }): string[] | undefined =>
    user === null ? undefined : [user.id],

  hooks: {
    // documents created outside the admin panel (REST/local API, MCP, seeding) never
    // evaluate the defaultValue above, so we fall back to the creating user here
    beforeChange: [
      ({
        value,
        req,
        operation,
      }: {
        value?: unknown;
        req: PayloadRequest;
        operation?: string;
      }): unknown => {
        if (operation !== 'create') return value;
        if (toAuthorIds(value).length > 0) return value;

        const { user } = req;
        return user === null ? value : [user.id];
      },
    ],
  },
};
