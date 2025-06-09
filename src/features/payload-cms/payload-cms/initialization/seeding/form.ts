import type { Form } from '@/features/payload-cms/payload-types';

export const contactForm: Form = {
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
  emails: [
    {
      emailTo: 'conveniat27@cevi.tools',
      emailFrom: '',
      subject: 'Neue Anfrage',
      message: {
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
                  text: '{{*:table}}', // the whole content of the form as a table.
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
    },
  ],
  sections: [
    {
      formSection: {
        sectionTitle: 'Persönliche Angaben',
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
        ],
      },
    },
    {
      formSection: {
        sectionTitle: 'Zustimmung',
        fields: [
          {
            blockName: 'agree_box',
            blockType: 'checkbox',
            name: 'checkbox',
            label: {
              root: {
                type: 'root',
                children: [
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: 'Da bin ich dabei.',
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
            required: true,
          },
          {
            name: 'comment',
            blockName: 'Kommentar',
            blockType: 'textarea',
            label: 'Kommentar',
            required: true,
          },
        ],
      },
    },
  ],
  submitButtonLabel: 'Absenden',
  title: 'Kontakt-Formular',
  updatedAt: '2023-01-12T21:25:41.113Z',
  _localized_status: {
    published: true,
  },
  _locale: 'de',
  _status: 'published',
};
