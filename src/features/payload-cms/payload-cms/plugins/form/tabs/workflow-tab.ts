import type { Field, Tab } from 'payload';

export const WORKFLOW_DEFINITIONS = {
  registrationWorkflow: {
    label: {
      en: 'Helper Registration Workflow',
      de: 'Helfer:innen-Anmeldung Workflow',
      fr: "Workflow d'inscription des bénévoles",
    },
    inputs: [
      {
        key: 'peopleId',
        label: {
          en: 'People ID (Cevi.DB User ID)',
          de: 'People ID (Cevi.DB User ID)',
          fr: 'People ID (Cevi.DB User ID)',
        },
        required: false,
      },
      {
        key: 'firstName',
        label: {
          en: 'First Name',
          de: 'Vorname',
          fr: 'Prénom',
        },
        required: true,
      },
      {
        key: 'lastName',
        label: {
          en: 'Last Name',
          de: 'Nachname',
          fr: 'Nom',
        },
        required: true,
      },
      {
        key: 'nickname',
        label: {
          en: 'Nickname',
          de: 'Ceviname',
          fr: 'Ceviname',
        },
        required: true,
      },
      {
        key: 'email',
        label: {
          en: 'Email',
          de: 'E-Mail',
          fr: 'Email',
        },
        required: true,
      },
      {
        key: 'birthDate',
        label: {
          en: 'Birth Date (YYYY-MM-DD)',
          de: 'Geburtsdatum (YYYY-MM-DD)',
          fr: 'Date de naissance (YYYY-MM-DD)',
        },
        required: true,
      },
    ],
  },
  brevoContactWorkflow: {
    label: {
      en: 'Brevo Contact Import',
      de: 'Brevo Kontakt-Import',
      fr: 'Importation de contacts Brevo',
    },
    inputs: [
      {
        key: 'email',
        label: {
          en: 'Email',
          de: 'E-Mail',
          fr: 'Email',
        },
        required: true,
      },
      {
        key: 'firstName',
        label: {
          en: 'First Name',
          de: 'Vorname',
          fr: 'Prénom',
        },
        required: false,
      },
      {
        key: 'lastName',
        label: {
          en: 'Last Name',
          de: 'Nachname',
          fr: 'Nom',
        },
        required: false,
      },
      {
        key: 'phone',
        label: {
          en: 'Phone Number',
          de: 'Telefonnummer',
          fr: 'Numéro de téléphone',
        },
        required: false,
      },
    ],
  },
};

export const formWorkflowField: Field = {
  name: 'configuredWorkflows',
  type: 'array',
  admin: {
    description: {
      en: 'Configure workflows to trigger after form submission.',
      de: 'Konfigurieren Sie Workflows, die nach dem Absenden des Formulars ausgelöst werden sollen.',
      fr: 'Configurez les workflows à déclencher après la soumission du formulaire.',
    },
  },
  label: {
    en: 'Trigger Workflows',
    de: 'Workflows auslösen',
    fr: 'Déclencher les workflows',
  },
  labels: {
    singular: { en: 'Workflow', de: 'Workflow', fr: 'Workflow' },
    plural: { en: 'Workflows', de: 'Workflows', fr: 'Workflows' },
  },
  fields: [
    {
      name: 'workflow',
      type: 'select',
      required: true,
      options: Object.entries(WORKFLOW_DEFINITIONS).map(([value, definition]) => ({
        label: definition.label,
        value,
      })),
      label: {
        en: 'Workflow to Trigger',
        de: 'Auslösender Workflow',
        fr: 'Workflow à déclencher',
      },
    },
    {
      name: 'condition',
      type: 'group',
      label: 'Optional Condition',
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: 'Enable Condition',
          defaultValue: false,
        },
        {
          name: 'field',
          type: 'text',
          label: 'Field Name to Check',
          admin: {
            condition: (_, siblingData) => Boolean(siblingData['enabled']),
          },
        },
        {
          name: 'value',
          type: 'text',
          label: 'Value to Match',
          admin: {
            condition: (_, siblingData) => Boolean(siblingData['enabled']),
          },
        },
      ],
    },
    {
      name: 'mapping',
      type: 'json',
      admin: {
        components: {
          Field: {
            path: '@/features/payload-cms/payload-cms/plugins/form/components/workflow-field-mapping#WorkflowFieldMapping',
            clientProps: {
              workflowDefinitions: WORKFLOW_DEFINITIONS,
            },
          },
        },
      },
    },
  ],
};

export const triggerWorkflowsButtonField: Field = {
  name: 'triggerWorkflowsButton',
  type: 'ui',
  admin: {
    components: {
      Field: '@/features/payload-cms/payload-cms/components/form/trigger-workflows-button',
    },
  },
};

export const workflowTab: Tab = {
  label: {
    en: 'Workflow Trigger',
    de: 'Workflow-Trigger',
    fr: 'Déclencheur de workflow',
  },
  fields: [formWorkflowField, triggerWorkflowsButtonField],
};
