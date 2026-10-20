import type { Field, Tab } from 'payload';

export const WORKFLOW_DEFINITIONS = {
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
      {
        key: 'abteilung',
        label: {
          en: 'Abteilung',
          de: 'Abteilung',
          fr: 'Abteilung',
        },
        required: false,
      },
      {
        key: 'region',
        label: {
          en: 'Region',
          de: 'Region',
          fr: 'Région',
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
      label: {
        en: 'Optional Condition',
        de: 'Optionale Bedingung',
        fr: 'Condition facultative',
      },
      fields: [
        {
          name: 'enabled',
          type: 'checkbox',
          label: {
            en: 'Enable Condition',
            de: 'Bedingung aktivieren',
            fr: 'Activer la condition',
          },
          defaultValue: false,
        },
        {
          name: 'field',
          type: 'text',
          label: {
            en: 'Field Name to Check',
            de: 'Zu prüfender Feldname',
            fr: 'Nom du champ à vérifier',
          },
          admin: {
            condition: (_, siblingData) => Boolean(siblingData['enabled']),
          },
        },
        {
          name: 'value',
          type: 'text',
          label: {
            en: 'Value to Match',
            de: 'Übereinstimmender Wert',
            fr: 'Valeur à correspondre',
          },
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
