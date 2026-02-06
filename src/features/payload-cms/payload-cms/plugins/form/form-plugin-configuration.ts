import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { beforeEmailChangeHook } from '@/features/payload-cms/payload-cms/plugins/form/fix-links-in-mails';
import { confirmationSettingsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/confirmation-settings-tab';
import { formFieldsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/form-fields-tab';
import { formResultsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/form-results-tab';
import { workflowTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/workflow-tab';
import { workflowTriggerOnFormSubmission } from '@/features/payload-cms/payload-cms/plugins/form/workflow-trigger-on-form-submission';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import type { Field, TabsField } from 'payload';

/**
 * Field for the internal form title.
 */
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

/**
 * Field for allowing browser autocompletion.
 */
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

/**
 * Tabs for the form builder.
 */
const formBuilderTabs: TabsField = {
  type: 'tabs',
  tabs: [formFieldsTab, confirmationSettingsTab, workflowTab, formResultsTab],
};

const formFields: Field[] = [formTitleField, formAllowAutocompleteField, formBuilderTabs];

const formLocalizationFields: Field[] = [
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
        // compute the publishing status
        getPublishingStatus({ slug: 'forms', fields: formFields }),
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
    hooks: { afterChange: [workflowTriggerOnFormSubmission] },
  },
  formOverrides: {
    trash: true,
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
      /**
       * As we are localizing only the label fields but not the values, enabling copy
       * to locale would not make sense and lead to data loss, as the labels in other
       * locales would be deleted.
       */
      disableCopyToLocale: true,
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
      drafts: { autosave: { interval: 300 } },
    },
    fields: () => [...formFields, ...formLocalizationFields],
  },
  beforeEmail: beforeEmailChangeHook,
});
