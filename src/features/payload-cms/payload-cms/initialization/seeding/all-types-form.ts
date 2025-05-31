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
              text: 'The form has been submitted successfully.',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          tag: 'h2',
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
      name: 'my-name',
      blockName: 'my-name',
      blockType: 'text',
      label: 'My Name',
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
      name: 'coolest-project',
      blockName: 'coolest-project',
      blockType: 'textarea',
      label: "What's the coolest project you've built with Payload so far?",
      required: false,
    },
    {
      blockName: 'agree-box',
      blockType: 'checkbox',
      name: 'checkbox',
      label: 'I agree',
      required: true,
    },
    {
      blockType: 'country',
      name: 'country',
      label: 'Country',
      blockName: 'country-selection',
      required: false,
    },
    {
      blockType: 'number',
      name: 'mynum',
      label: 'Choose a number',
      blockName: 'number-chooser',
      required: false,
    },
    {
      blockType: 'select',
      name: 'selection',
      label: 'Select your favorite!',
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
  submitButtonLabel: 'Submit',
  title: 'Basic Form',
  updatedAt: '2023-01-12T21:25:41.113Z',
  _localized_status: {
    published: true,
  },
  _locale: 'de',
};
