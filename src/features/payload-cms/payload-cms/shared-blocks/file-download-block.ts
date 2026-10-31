import type { Block } from 'payload';

export const fileDownloadBlock: Block = {
  slug: 'fileDownload',
  interfaceName: 'FileDownloadBlock',
  imageURL: '/admin-block-images/file-download-block.png',
  imageAltText: 'File Download Block',
  fields: [
    {
      name: 'groups',
      label: {
        en: 'Groups',
        de: 'Gruppen',
        fr: 'Groupes',
      },
      labels: {
        singular: { en: 'Group', de: 'Gruppe', fr: 'Groupe' },
        plural: { en: 'Groups', de: 'Gruppen', fr: 'Groupes' },
      },
      type: 'array',
      required: true,
      minRows: 1,
      admin: {
        description: {
          en: 'Each group is shown as its own list under its title. For a plain list, use one group without a title.',
          de: 'Jede Gruppe erscheint als eigene Liste unter ihrem Titel. Für eine einfache Liste genügt eine Gruppe ohne Titel.',
          fr: 'Chaque groupe apparaît comme une liste à part sous son titre. Pour une simple liste, un seul groupe sans titre suffit.',
        },
      },
      fields: [
        {
          name: 'title',
          label: {
            en: 'Title',
            de: 'Titel',
            fr: 'Titre',
          },
          type: 'text',
          admin: {
            description: {
              en: 'Optional, for example "For parents".',
              de: 'Optional, zum Beispiel «Für Eltern».',
              fr: 'Facultatif, par exemple « Pour les parents ».',
            },
          },
        },
        {
          name: 'files',
          label: {
            en: 'Files',
            de: 'Dateien',
            fr: 'Fichiers',
          },
          type: 'relationship',
          relationTo: 'documents',
          hasMany: true,
          required: true,
        },
      ],
    },
    {
      name: 'openInNewTab',
      label: 'Open in new tab',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
};
