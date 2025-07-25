import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import {
  defaultEditorLexicalConfig,
  HeadingFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical';
import type { Block, Field, TabsField, TextFieldSingleValidation } from 'payload';

const formTitleField: Field = {
  name: 'title',
  type: 'text',
  required: true,
  localized: true,
  label: {
    en: 'Internal Form Title',
    de: 'Interner Formular Titel',
    fr: 'Titre du formulaire interne',
  },
};

const formAllowAutocompleteField: Field = {
  name: 'autocomplete',
  type: 'checkbox',
  required: false,
  defaultValue: true,
  label: {
    en: 'Allow Browser Autocompletion',
    de: 'Browser Autovervollständigung erlauben',
    fr: 'Autoriser la saisie automatique du navigateur',
  },
};

const formLexicalEditorSettings = lexicalEditor({
  features: [
    ...minimalEditorFeatures,
    HeadingFeature({
      enabledHeadingSizes: ['h3'],
    }),
  ],
  lexical: defaultEditorLexicalConfig,
});

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
  editor: formLexicalEditorSettings,
};

/**
 * validate that the field name is lowercase, no special characters, and not empty
 */
const formNameValidation: TextFieldSingleValidation = (value) => {
  if (value === null || value === undefined || value.trim() === '') {
    return 'Name is required';
  }
  if (value !== value.toLowerCase()) {
    return 'Name must be lowercase';
  }
  if (/[^a-z0-9_]/.test(value)) {
    return 'Name can only contain lowercase letters, numbers, and underscores';
  }
  return true;
};

const validateRegex: TextFieldSingleValidation = (value) => {
  if (!value) return true; // allow empty values
  try {
    new RegExp(value);
    return true;
  } catch {
    return 'Invalid regular expression';
  }
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
      editor: formLexicalEditorSettings,
    },
  ],
};

const formCheckboxBlock: Block = {
  slug: 'checkbox',
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Checkbox Field',
            de: 'Checkbox Feld',
            fr: 'Champ Checkbox',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
          type: 'richText',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
          editor: lexicalEditor({
            features: [...minimalEditorFeatures],
            lexical: defaultEditorLexicalConfig,
          }),
        },
      ],
    },
    { name: 'required', type: 'checkbox', label: 'Required', admin: { width: '50%' } },
    { name: 'defaultValue', type: 'checkbox', label: 'Default Value' },
  ],
  labels: { plural: 'Checkbox Fields', singular: 'Checkbox' },
};

const formDateBlock: Block = {
  slug: 'date',
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Date Field',
            de: 'Datum Feld',
            fr: 'Champ Date',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
          type: 'text',
          label: 'Label',
          localized: true,
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'defaultValue',
      type: 'date',
      label: 'Default Value',
    },
    {
      name: 'required',
      type: 'checkbox',
      label: 'Required',
    },
  ],
};

const formCountryBlock: Block = {
  slug: 'country',
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Country Field',
            de: 'Länderfeld',
            fr: 'Champ Pays',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
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
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Email Field',
            de: 'E-Mail Feld',
            fr: 'Champ Email',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
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
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Number Field',
            de: 'Zahlenfeld',
            fr: 'Champ Numérique',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
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
    { name: 'placeholder', type: 'text', label: 'Placeholder' },
    { name: 'required', type: 'checkbox', label: 'Required' },
  ],
  labels: { plural: 'Number Fields', singular: 'Number' },
};

const formSelectBlock: Block = {
  slug: 'select',
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Select Field',
            de: 'Auswahlfeld',
            fr: 'Champ Sélection',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
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
      type: 'checkbox',
      name: 'allowMultiple',
      label: 'Allow Multiple Selection',
    },
    {
      name: 'optionType',
      type: 'radio',
      options: [
        { label: 'Select Dropdown', value: 'dropdown' },
        { label: 'Select Cards', value: 'cards' },
        { label: 'Radio Boxes', value: 'radio' },
      ],
      defaultValue: 'dropdown',
      admin: {
        description: {
          de: 'Wählen Sie aus, ob die Optionen als Dropdown, Auswahlkästchen oder Radioknöpfe angezeigt werden sollen.',
          en: 'Choose whether the options should be displayed as a dropdown, cards boxes, or radio buttons.',
          fr: 'Choisissez si les options doivent être affichées sous forme de liste déroulante, de cases à cocher ou de boutons radio.',
        },
      },
    },
    {
      name: 'options',
      type: 'array',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'value',
              type: 'text',
              admin: { width: '50%' },
              label: 'Name (lowercase, no special characters)',
              required: true,
            },
            {
              name: 'label',
              type: 'text',
              admin: { width: '50%' },
              label: 'Label',
              localized: true,
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
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Text Field',
            de: 'Textfeld',
            fr: 'Champ Texte',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
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
        { name: 'placeholder', type: 'text', label: 'Placeholder', localized: true },
        {
          name: 'defaultValue',
          type: 'text',
          admin: { width: '50%' },
          label: 'Default Value',
          localized: true,
        },
      ],
    },

    {
      type: 'group',
      label: 'Input Validation',
      fields: [
        {
          name: 'required',
          type: 'checkbox',
          label: 'Required',
          admin: {
            description: 'Required field',
          },
        },
        {
          name: 'inputValidation',
          type: 'text',
          label: 'Input Validation (Regex)',
          admin: {
            description:
              'Use a regular expression to validate the input. For example, "^[a-zA-Z0-9]+$" will only allow alphanumeric characters.',
          },
          validate: validateRegex,
        },
        {
          name: 'inputValidationErrorMessage',
          type: 'text',
          label: 'Input Validation Error Message',
          localized: true,
          admin: {
            description:
              'Custom error message to display when the input does not match the validation regex.',
          },
        },
      ],
    },
  ],
  labels: { plural: 'Text Fields', singular: 'Text' },
};

const formTextareaBlock: Block = {
  slug: 'textarea',
  admin: {
    components: {
      Label: {
        path: '@/features/payload-cms/payload-cms/components/form-block-label#FormBlockLabel',
        clientProps: {
          label: {
            en: 'Text Area Field',
            de: 'Textbereich Feld',
            fr: 'Champ Zone de Texte',
          },
        },
      },
    },
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name (lowercase, no special characters)',
          validate: formNameValidation,
          required: true,
          admin: { width: '50%' },
        },
        {
          name: 'label',
          required: true,
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
        { name: 'placeholder', type: 'text', label: 'Placeholder', localized: true },
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
  formDateBlock,
];

const conditionedBlock: Block = {
  slug: 'conditionedBlock',
  fields: [
    {
      name: 'displayCondition',
      label: 'Display Condition',
      type: 'group',
      fields: [
        {
          name: 'field',
          label: 'Field to check',
          type: 'text',
          admin: { placeholder: 'e.g. confirmationType' },
        },
        {
          name: 'value',
          label: 'Value to match',
          type: 'text',
          admin: { placeholder: 'e.g. message' },
        },
      ],
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

const formBlocksAndConditionedBlock: Block[] = [...formBlocks, conditionedBlock];

export const formPluginConfiguration = formBuilderPlugin({
  fields: {
    state: false, // we do not use states in CH
    date: true,
  },
  formSubmissionOverrides: {
    labels: {
      singular: {
        en: 'Form Submission',
        de: 'Formular Antwort',
        fr: 'Soumission de Formulaire',
      },
      plural: {
        en: 'Form Submissions',
        de: 'Formular Antworten',
        fr: 'Soumissions de Formulaires',
      },
    },
    admin: {
      group: AdminPanelDashboardGroups.GlobalSettings,
      groupBy: true,
    },
    access: {
      read: canAccessAdminPanel,
      create: () => true, // allow creating submissions
      update: () => false, // disable update for submissions
      delete: () => false, // disable delete for submissions
    },
  },
  formOverrides: {
    labels: {
      singular: {
        en: 'Form',
        de: 'Formular',
        fr: 'Formulaire',
      },
      plural: {
        en: 'Forms',
        de: 'Formulare',
        fr: 'Formulaires',
      },
    },
    access: {
      read: canAccessAdminPanel,
      create: canAccessAdminPanel,
      update: canAccessAdminPanel,
      delete: canAccessAdminPanel,
    },
    defaultPopulate: {
      versions: false,
    },
    admin: {
      group: AdminPanelDashboardGroups.PagesAndContent,
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
      const formSection: Field = {
        type: 'group',
        name: 'formSection',
        fields: [
          {
            type: 'text',
            name: 'sectionTitle',
            label: {
              en: 'Section Title',
              de: 'Abschnitts Titel',
              fr: 'Titre de la section',
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
            blocks: formBlocksAndConditionedBlock,
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
                name: 'sections',
                type: 'array',
                admin: {
                  initCollapsed: true,
                  components: {
                    RowLabel:
                      '@/features/payload-cms/payload-cms/components/form-section-row-label#FormSectionRowLabel',
                  },
                },
                fields: [formSection],
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
                name: 'exportAsCSV',
                type: 'ui',
                admin: {
                  components: {
                    Field: {
                      path: '@/features/payload-cms/payload-cms/components/form-export-button#FormExportButton',
                    },
                  },
                },
              },
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

      const fields: Field[] = [formTitleField, formAllowAutocompleteField, tabs];

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
