import type { Field, Tab } from 'payload';

const WORKFLOW_DEFINITIONS = {
  registrationWorkflow: {
    label: {
      en: 'Helper Registration Workflow',
      de: 'Helfer:innen-Anmeldung Workflow',
      fr: 'Workflow de registraion',
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
};

export const formWorkflowField: Field = {
  name: 'workflow',
  type: 'select',
  admin: {
    description: {
      en: 'Select a workflow to trigger after form submission.',
      de: 'Wählen Sie einen Workflow aus, der nach dem Absenden des Formulars ausgelöst werden soll.',
      fr: 'Sélectionnez un workflow à déclencher après la soumission du formulaire.',
    },
  },
  label: {
    en: 'Trigger Workflow',
    de: 'Workflow auslösen',
    fr: 'Déclencher le workflow',
  },
  options: Object.entries(WORKFLOW_DEFINITIONS).map(([value, definition]) => ({
    label: definition.label,
    value,
  })),
  required: false,
};

export const formWorkflowMappingField: Field = {
  name: 'workflowMapping',
  type: 'json',
  admin: {
    disableListColumn: true,
    components: {
      Field: {
        path: '@/features/payload-cms/payload-cms/plugins/form/components/workflow-field-mapping#WorkflowFieldMapping',
        clientProps: {
          workflowDefinitions: WORKFLOW_DEFINITIONS,
        },
      },
    },
  },
};

export const workflowTab: Tab = {
  label: {
    en: 'Workflow Trigger',
    de: 'Workflow-Trigger',
    fr: 'Déclencheur de workflow',
  },
  fields: [formWorkflowField, formWorkflowMappingField],
};
