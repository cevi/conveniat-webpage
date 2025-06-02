import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import type { Block, Field, TabsField } from 'payload';

const formTitleField: Field = {
  name: 'title',
  type: 'text',
  required: true,
  label: {
    en: 'Form Title',
    de: 'Formular Titel',
    fr: 'Titre du formulaire',
  },
  admin: {
    description: {
      de: 'Dieser Titel wird ganz oben beim Formular angezeigt. Gleichzeitig dient er als interne Bezeichnung für das Formular.',
      en: 'This title will be displayed at the top of the form. It also serves as an internal identifier for the form.',
      fr: 'Ce titre sera affiché en haut du formulaire. Il sert également d’identifiant interne pour le formulaire.',
    },
  },
};

const formSubmitButtonLabelField: Field = {
  name: 'submitButtonLabel',
  type: 'text',
  required: true,
  localized: true,
};

const formConfirmationTypeField: Field = {
  name: 'confirmationType',
  type: 'radio',
  admin: {
    description:
      'Choose whether to display an on-page message or redirect to a different page after they submit the form.',
    layout: 'horizontal',
  },
  defaultValue: 'message',
  options: [
    { label: 'Message', value: 'message' },
    { label: 'Redirect', value: 'redirect' },
  ],
};

const formConfirmationMessageField: Field = {
  name: 'confirmationMessage',
  type: 'richText',
  admin: {
    condition: (_, siblingData) => siblingData['confirmationType'] === 'message',
  },
  localized: true,
  required: true,
};

const formRedirectField: Field = {
  name: 'redirect',
  type: 'group',
  admin: {
    condition: (_, siblingData) => siblingData['confirmationType'] === 'redirect',
    hideGutter: true,
  },
  fields: [
    {
      name: 'url',
      type: 'text',
      label: 'URL to redirect to',
      required: true,
    },
  ],
};

const formEmailField: Field = {
  name: 'emails',
  type: 'array',
  access: {},
  admin: {
    description:
      "Send custom emails when the form submits. Use comma separated lists to send the same email to multiple recipients. To reference a value from this form, wrap that field's name with double curly brackets, i.e. {{firstName}}. You can use a wildcard {{*}} to output all data and {{*:table}} to format it as an HTML table in the email.",
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'emailTo',
          type: 'text',
          admin: { placeholder: '"Email Sender" <sender@email.com>', width: '100%' },
          label: 'Email To',
        },
        { name: 'cc', type: 'text', admin: { style: { maxWidth: '50%' } }, label: 'CC' },
        {
          name: 'bcc',
          type: 'text',
          admin: { style: { maxWidth: '50%' } },
          label: 'BCC',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'replyTo',
          type: 'text',
          admin: { placeholder: '"Reply To" <reply-to@email.com>', width: '50%' },
          label: 'Reply To',
        },
        {
          name: 'emailFrom',
          type: 'text',
          admin: { placeholder: '"Email From" <email-from@email.com>', width: '50%' },
          label: 'Email From',
        },
      ],
    },
    {
      name: 'subject',
      type: 'text',
      defaultValue: "You've received a new message.",
      label: 'Subject',
      localized: true,
      required: true,
    },
    {
      name: 'message',
      type: 'richText',
      admin: { description: 'Enter the message that should be sent in this email.' },
      label: 'Message',
      localized: true,
    },
  ],
};

const formCheckboxBlock: Block = {
  slug: 'checkbox',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'required', type: 'checkbox', label: 'Required', admin: { width: '50%' } },
    { name: 'defaultValue', type: 'checkbox', label: 'Default Value' },
  ],
  labels: { plural: 'Checkbox Fields', singular: 'Checkbox' },
};

const formCountryBlock: Block = {
  slug: 'country',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'required',
      type: 'checkbox',
      label: 'Required',
    },
  ],
  labels: { plural: 'Country Fields', singular: 'Country' },
};

const formEmailBlock: Block = {
  slug: 'email',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    { name: 'placeholder', type: 'text', label: 'Placeholder' },
    {
      name: 'required',
      type: 'checkbox',
      label: 'Required',
    },
  ],
  labels: { plural: 'Email Fields', singular: 'Email' },
};

const formRichTextBlock: Block = {
  slug: 'message',
  fields: [{ name: 'message', type: 'richText', localized: true }],
  labels: { plural: 'Message Blocks', singular: 'Message' },
};

const formNumberBlock: Block = {
  slug: 'number',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'defaultValue',
      type: 'number',
      admin: { width: '50%' },
      label: 'Default Value',
    },
    { name: 'required', type: 'checkbox', label: 'Required' },
  ],
  labels: { plural: 'Number Fields', singular: 'Number' },
};

const formSelectBlock: Block = {
  slug: 'select',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'defaultValue',
      type: 'text',
      admin: { width: '50%' },
      label: 'Default Value',
      localized: true,
    },
    {
      type: 'row',
      fields: [{ name: 'placeholder', type: 'text', label: 'Placeholder' }],
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              admin: { width: '50%' },
              label: 'Label',
              localized: true,
              required: true,
            },
            {
              name: 'value',
              type: 'text',
              admin: { width: '50%' },
              label: 'Value',
              required: true,
            },
          ],
        },
      ],
      label: 'Select Attribute Options',
      labels: { plural: 'Options', singular: 'Option' },
    },
    { name: 'required', type: 'checkbox', label: 'Required' },
  ],
  labels: { plural: 'Select Fields', singular: 'Select' },
};

const formTextBlock: Block = {
  slug: 'text',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'placeholder', type: 'text', label: 'Placeholder' },
        {
          name: 'defaultValue',
          type: 'text',
          admin: { width: '50%' },
          label: 'Default Value',
          localized: true,
        },
      ],
    },
    { name: 'required', type: 'checkbox', label: 'Required' },
  ],
  labels: { plural: 'Text Fields', singular: 'Text' },
};

const formTextareaBlock: Block = {
  slug: 'textarea',
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'placeholder', type: 'text', label: 'Placeholder' },
        {
          name: 'defaultValue',
          type: 'text',
          admin: { width: '50%' },
          label: 'Default Value',
          localized: true,
        },
      ],
    },
    { name: 'required', type: 'checkbox', label: 'Required' },
  ],
  labels: { plural: 'Text Area Fields', singular: 'Text Area' },
};

const formBlocks: Block[] = [
  formCheckboxBlock,
  formCountryBlock,
  formEmailBlock,
  formRichTextBlock,
  formNumberBlock,
  formSelectBlock,
  formTextBlock,
  formTextareaBlock,
];

export const formPluginConfiguration = formBuilderPlugin({
  fields: {
    state: false, // we do not use states in CH
  },
  formOverrides: {
    access: {
      read: canAccessAdminPanel,
    },
    defaultPopulate: {
      versions: false,
    },
    admin: {
      defaultColumns: ['id', 'publishingStatus', 'title'],
      components: {
        beforeList: [
          '@/features/payload-cms/payload-cms/components/disable-actions/disable-many-actions',
        ],
        edit: {
          beforeDocumentControls: [
            {
              path: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status-client',
            },
            {
              path: '@/features/payload-cms/payload-cms/components/qr-code/qr-code',
            },
          ],
          PublishButton:
            '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publish-localized',
        },
      },
    },
    // versioning must be enabled for localized collections
    versions: {
      maxPerDoc: 100,
      drafts: {
        autosave: {
          interval: 300,
        },
      },
    },
    fields: () => {
      const formPage: Block = {
        slug: 'formPage',
        fields: [
          {
            type: 'text',
            name: 'pageTitle',
            label: {
              en: 'Page Title',
              de: 'Seitentitel',
              fr: 'Titre de la page',
            },
            required: true,
          },
          {
            type: 'blocks',
            name: 'fields',
            label: {
              en: 'Form Fields',
              de: 'Formularfelder',
              fr: 'Champs du formulaire',
            },
            blocks: formBlocks,
          },
        ],
      };

      const tabs: TabsField = {
        type: 'tabs',
        tabs: [
          {
            label: {
              en: 'Form Fields',
              de: 'Formularfelder',
              fr: 'Champs du formulaire',
            },
            fields: [
              {
                name: 'fields',
                type: 'blocks',
                blocks: [formPage, ...formBlocks],
                localized: true,
                required: true,
              },
            ],
          },
          {
            label: {
              en: 'Confirmation / Submission Settings',
              de: 'Bestätigungs- / Einreichungseinstellungen',
              fr: 'Paramètres de confirmation / soumission',
            },
            fields: [
              formSubmitButtonLabelField,
              formConfirmationTypeField,
              formConfirmationMessageField,
              formRedirectField,
              formEmailField,
            ],
          },
          {
            label: {
              en: 'Submissions',
              de: 'Ergebnisse',
              fr: 'Soumissions',
            },
            fields: [
              {
                name: 'submissions',
                type: 'join',
                collection: 'form-submissions',
                on: 'form',
                admin: {
                  allowCreate: false,
                },
              },
            ],
          },
        ],
      };

      const fields: Field[] = [formTitleField, tabs];

      return [
        ...fields,
        {
          name: 'publishingStatus',
          type: 'json',
          admin: {
            readOnly: true,
            hidden: true,
            components: {
              Cell: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status',
            },
          },
          access: {
            create: (): boolean => false,
            update: (): boolean => false,
          },
          virtual: true,
          hooks: {
            afterRead: [
              getPublishingStatus({
                slug: 'forms',
                fields: fields,
              }),
            ],
          },
        },
        {
          name: '_localized_status',
          type: 'json', // required
          required: true,
          localized: true,
          defaultValue: {
            published: false,
          },
          // we use a custom JSON schema for the field
          // in order to generate the correct types
          jsonSchema: localizedStatusSchema,
          admin: {
            disabled: true,
          },
        },

        {
          name: '_disable_unpublishing',
          type: 'checkbox',
          admin: {
            disabled: true,
          },
          localized: false,
          defaultValue: false,
        },

        {
          name: '_locale',
          type: 'text',
          required: true,
          localized: true,
          admin: {
            disabled: true,
          },
        },
      ];
    },
  },
});
