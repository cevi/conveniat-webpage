import type { Field, PayloadRequest } from 'payload';

export const LastEditedByUserField: Field = {
  type: 'relationship',
  name: 'lastEditedByUser',
  label: {
    en: 'Last Edited By User',
    de: 'Zuletzt bearbeitet von Benutzer',
    fr: "Dernière modification par l'utilisateur",
  },
  relationTo: 'users',
  admin: {
    readOnly: true,
    position: 'sidebar',
  },
  hooks: {
    beforeChange: [
      ({ value, req }: { value?: string; req: PayloadRequest }): string | undefined => {
        if (req.user && typeof req.user.id === 'string') {
          return req.user.id;
        }
        return value; // keep existing value if no user
      },
    ],
  },
};
