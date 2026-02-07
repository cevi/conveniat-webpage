import { minimalEditorFeatures } from '@/features/payload-cms/payload-cms/plugins/lexical-editor';
import { patchRichTextLinkHook } from '@/features/payload-cms/payload-cms/utils/link-field-logic';
import { defaultEditorLexicalConfig, lexicalEditor } from '@payloadcms/richtext-lexical';
import type { Block, Field, Tab, TextFieldSingleValidation } from 'payload';

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
  if (value == undefined) return true; // allow empty values
  try {
    new RegExp(value);
    return true;
  } catch {
    return 'Invalid regular expression';
  }
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
          hooks: patchRichTextLinkHook,
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
  fields: [
    {
      name: 'message',
      type: 'richText',
      localized: true,
      hooks: patchRichTextLinkHook,
    },
  ],
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
      localized: true,
    },
    {
      type: 'blocks',
      name: 'fields',
      label: {
        en: 'Form Fields',
        de: 'Formular-Felder',
        fr: 'Champs du formulaire',
      },
      blocks: formBlocksAndConditionedBlock,
    },
  ],
};

export const formFieldsTab: Tab = {
  label: {
    en: 'Form Fields',
    de: 'Formular-Felder',
    fr: 'Champs du formulaire',
  },
  fields: [
    {
      name: 'sections',
      label: {
        en: 'Form Sections',
        de: 'Formular-Abschnitte',
        fr: 'Sections du formulaire',
      },
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
};
