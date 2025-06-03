import type { Form } from '@/features/payload-cms/payload-types';

export const basicForm: Form = {
  id: '63c0651b132c8e2783f8dcae',
  confirmationMessage: {
    root: {
      type: 'root',
      children: [
        {
          type: 'heading',
          children: [
            {
              type: 'text',
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: 'Das Formular wurde erfolgreich abgeschickt.',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          tag: 'h3',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  },
  confirmationType: 'message',
  createdAt: '2022-12-28T20:48:53.181Z',
  emails: [],
  fields: [
    {
      id: '63adaaba5236fe69ca8973f8',
      name: 'my_name',
      blockName: 'my-name',
      blockType: 'text',
      label: 'Mein Name',
      required: true,
    },
    {
      name: 'email',
      blockName: 'email',
      blockType: 'email',
      label: 'Email',
      required: true,
    },
    {
      name: 'coolest_project',
      blockName: 'coolest-project',
      blockType: 'textarea',
      label: 'Was ist das beste Projekt, welches auf Github existiert?',
      required: false,
    },
    {
      blockName: 'agree_box',
      blockType: 'checkbox',
      name: 'checkbox',
      label: 'Da bin ich dabei!',
      required: true,
    },
    {
      blockType: 'country',
      name: 'country',
      label: 'Land',
      blockName: 'country-selection',
      required: false,
    },
    {
      blockType: 'number',
      name: 'mynum',
      label: 'Nummer auswählen',
      blockName: 'number-chooser',
      required: false,
    },
    {
      blockType: 'select',
      name: 'selection',
      label: 'Burger?',
      blockName: 'selectioning',
      required: true,
      options: [
        {
          label: 'Burger King',
          value: 'bk',
        },
        {
          label: 'Mc Donalds',
          value: 'mc',
        },
      ],
    },
  ],
  submitButtonLabel: 'Absenden',
  title: 'Beispiel Formular',
  updatedAt: '2023-01-12T21:25:41.113Z',
  _localized_status: {
    published: true,
  },
  _locale: 'de',
  _status: 'published',
};
