import { environmentVariables } from '@/config/environment-variables';
import { formHofDashboardField } from '@/features/hof-dashboard/payload-cms/form-hof-dashboard-field';
import { formSubmissionReviewFields } from '@/features/hof-dashboard/payload-cms/form-submission-review-fields';
import { acceptOnApproval } from '@/features/hof-dashboard/payload-cms/hooks/accept-on-approval';
import { checkHofDashboardSubmission } from '@/features/hof-dashboard/payload-cms/hooks/check-hof-dashboard-submission';
import { recordHofReview } from '@/features/hof-dashboard/payload-cms/hooks/record-hof-review';
import {
  hasAccessToThisHelper,
  hasAdminOrWebAccess,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { getFormSubmissionResendOptionsHandler } from '@/features/payload-cms/payload-cms/plugins/form/endpoints/get-form-submission-resend-options';
import { resendFormSubmissionEmailsHandler } from '@/features/payload-cms/payload-cms/plugins/form/endpoints/resend-form-submission-emails';
import { triggerPastWorkflowsHandler } from '@/features/payload-cms/payload-cms/plugins/form/endpoints/trigger-past-workflows';
import { beforeEmailChangeHook } from '@/features/payload-cms/payload-cms/plugins/form/fix-links-in-mails';
import {
  helperJobsField,
  smtpResultsField,
  workflowResultsField,
} from '@/features/payload-cms/payload-cms/plugins/form/form-submission-server-fields';
import { ensureApprovalToken } from '@/features/payload-cms/payload-cms/plugins/form/hooks/ensure-approval-token';
import { extractEmailLinksHook } from '@/features/payload-cms/payload-cms/plugins/form/hooks/extract-email-links';
import { linkHofSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/link-hof-submission';
import { linkJobSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/link-job-submission';
import { nameMaterialLines } from '@/features/payload-cms/payload-cms/plugins/form/hooks/name-material-lines';
import { validateFormSubmission } from '@/features/payload-cms/payload-cms/plugins/form/hooks/validate-form-submission';
import { approvalEmailTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/approval-email-tab';
import { confirmationSettingsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/confirmation-settings-tab';
import { formFieldsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/form-fields-tab';
import { formResultsTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/form-results-tab';
import { workflowTab } from '@/features/payload-cms/payload-cms/plugins/form/tabs/workflow-tab';
import { workflowTriggerOnFormSubmission } from '@/features/payload-cms/payload-cms/plugins/form/workflow-trigger-on-form-submission';
import {
  flushPageCacheOnChange,
  rememberDraftSave,
} from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import type { Field, TabsField } from 'payload';

import { markUploadedFilesPermanent } from '@/features/payload-cms/payload-cms/plugins/form/hooks/mark-uploaded-files-permanent';
import { sendApprovalEmail } from '@/features/payload-cms/payload-cms/plugins/form/hooks/send-approval-email';

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
 * Field for configuring file upload size limit (MB).
 */
const formFileUploadLimitField: Field = {
  name: 'fileUploadLimitMB',
  type: 'number',
  defaultValue: 10,
  min: 1,
  label: {
    en: 'File Upload Limit (MB)',
    de: 'Datei-Upload-Limit (MB)',
    fr: 'Limite de téléversement de fichier (Mo)',
  },
  admin: {
    description: {
      en: 'Maximum allowed file size in megabytes for file uploads in this form.',
      de: 'Maximale zulässige Dateigröße in Megabyte für Datei-Uploads in diesem Formular.',
      fr: 'Taille maximale de fichier autorisée en mégaoctets pour ce formulaire.',
    },
  },
};

/**
 * Tabs for the form builder.
 */
const formBuilderTabs: TabsField = {
  type: 'tabs',
  tabs: [
    formFieldsTab,
    confirmationSettingsTab,
    approvalEmailTab,
    // next to the workflows, and here rather than in workflow-tab.ts, which the admin's client
    // components import: the Hof dashboard's group reads a server-side feature flag
    { ...workflowTab, fields: [...workflowTab.fields, formHofDashboardField] },
    formResultsTab,
  ],
};

const formFields: Field[] = [
  formTitleField,
  formAllowAutocompleteField,
  formFileUploadLimitField,
  formBuilderTabs,
];

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
      group: AdminPanelDashboardGroups.WebpageContent.label,
      groupBy: true,
      defaultColumns: [
        'id',
        'form',
        'approved',
        'createdAt',
        'smtpResults',
        'workflowResults',
        'resendMail',
      ],
    },
    access: {
      read: hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam] }),
      create: () => true, // allow creating submissions
      update: hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam] }),
      delete: () => false, // disable delete for submissions
    },
    fields: ({ defaultFields }) => {
      const updatedFields = defaultFields.map((field) => {
        if ('name' in field && field.name === 'submissionData' && field.type === 'array') {
          return {
            ...field,
            fields: field.fields.map((subField) => {
              if ('name' in subField && subField.name === 'value') {
                return {
                  ...subField,
                  admin: {
                    ...subField.admin,
                    components: {
                      Field:
                        '@/features/payload-cms/payload-cms/components/form-submissions/submission-value-field',
                    },
                  },
                };
              }
              return subField;
            }),
          } as Field;
        }
        return field;
      });

      return [
        ...updatedFields,
        {
          name: 'approved',
          type: 'checkbox',
          defaultValue: false,
          // Anyone may hand in a form, but an approved answer shows on the website and on a
          // Hof's dashboard, so only the reviewers may set it. The approval link writes it
          // with overrideAccess.
          access: {
            create: hasAdminOrWebAccess,
            update: hasAdminOrWebAccess,
          },
          label: {
            en: 'Approved',
            de: 'Freigegeben',
            fr: 'Approuvé',
          },
          admin: {
            position: 'sidebar' as const,
            description: {
              en: 'Approve this submission to display it on the website',
              de: 'Formular-Antwort freigeben, um sie auf der Website anzuzeigen',
              fr: 'Approuver cette soumission pour l’afficher sur le site web',
            },
            components: {
              Field:
                '@/features/payload-cms/payload-cms/components/form-submissions/approval-field',
            },
          },
        },
        {
          name: 'approvalToken',
          type: 'text',
          index: true,
          // it approves the submission, so it must not come back to whoever sent it
          access: { read: hasAdminOrWebAccess },
          admin: {
            position: 'sidebar' as const,
            readOnly: true,
            description: {
              en: 'Pre-signed token for approving this submission',
              de: 'Pre-Signed Token zur Freigabe dieser Formular-Antwort',
              fr: 'Jeton pré-signé pour approuver cette soumission',
            },
          },
        },
        smtpResultsField,
        workflowResultsField,
        {
          name: 'resendMail',
          type: 'ui',
          admin: {
            position: 'sidebar',
            components: {
              Cell: '@/features/payload-cms/payload-cms/components/form-submissions/resend-mail-cell',
            },
          },
        },
        helperJobsField,
        {
          name: 'hof',
          type: 'relationship',
          relationTo: 'hoefe',
          index: true,
          label: { en: 'Hof', de: 'Hof', fr: 'Hof' },
          admin: {
            // it links to the Hof dashboard; a deployment without it has nothing to link to
            hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
            position: 'sidebar',
            description: {
              en: 'Set by a "Hof Selection" field. Set it by hand for an older submission, and the Hof finds it on its dashboard.',
              de: 'Wird von einem Feld "Hof Auswahl" gesetzt. Bei älteren Antworten von Hand setzen, dann findet der Hof sie auf seinem Dashboard.',
              fr: 'Défini par un champ « Sélection du Hof ». Le définir à la main pour une ancienne réponse, et le Hof la retrouve sur son tableau de bord.',
            },
          },
        },
        ...formSubmissionReviewFields,
      ] as Field[];
    },
    hooks: {
      beforeChange: [
        ensureApprovalToken,
        validateFormSubmission,
        nameMaterialLines,
        linkJobSubmission,
        linkHofSubmission,
        checkHofDashboardSubmission,
        acceptOnApproval,
        recordHofReview,
      ],
      afterChange: [workflowTriggerOnFormSubmission, markUploadedFilesPermanent, sendApprovalEmail],
    },
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
      read: hasAccessToThisHelper({
        requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.TranslationTeam],
      }),
      create: hasAdminOrWebAccess,
      update: hasAccessToThisHelper({
        requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam, Roles.TranslationTeam],
      }),
      delete: hasAdminOrWebAccess,
    },
    endpoints: [
      {
        path: '/:id/trigger-workflows',
        method: 'post',
        handler: triggerPastWorkflowsHandler,
      },
      {
        path: '/:id/resend-options',
        method: 'get',
        handler: getFormSubmissionResendOptionsHandler,
      },
      {
        path: '/:id/resend',
        method: 'post',
        handler: resendFormSubmissionEmailsHandler,
      },
    ],
    // A form block on a page populates its form, and the page hands it to the client
    // FormBlock, so every field listed here ends up in the public HTML. Keep it to what
    // the form renderer reads. The mail settings, workflows and the submissions join
    // stay on the server; code that needs them reads the form directly.
    defaultPopulate: {
      _localized_status: true,
      sections: true,
      submitButtonLabel: true,
      confirmationType: true,
      confirmationMessage: true,
      redirect: true,
    },
    admin: {
      group: AdminPanelDashboardGroups.WebpageContent.label,
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
              path: '@/features/payload-cms/payload-cms/components/live-preview-restorer',
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
    fields: () => [
      ...formFields,
      ...formLocalizationFields,
      {
        name: 'emailReferencedIds',
        type: 'json',
        admin: { hidden: true },
      },
    ],
    hooks: {
      beforeOperation: [rememberDraftSave],
      beforeChange: [extractEmailLinksHook],
      afterChange: [flushPageCacheOnChange],
    },
  },
  beforeEmail: beforeEmailChangeHook,
});
