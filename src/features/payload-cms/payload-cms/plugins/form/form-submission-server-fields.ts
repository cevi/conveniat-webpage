import { environmentVariables } from '@/config/environment-variables';
import { parseSmtpResultsHook } from '@/features/payload-cms/payload-cms/hooks/parse-smtp-results';
import type { Field, FieldAccess } from 'payload';

/**
 * Anyone may create a submission, so a value sent along with it is not taken at its word: the
 * mail results, the workflow results and the job links are the server's to write, through the
 * local API. Payload applies field access in its beforeValidate step, before the collection's
 * beforeChange hooks run, so `linkJobSubmission` still links the job picked in the form. On
 * update a denied field keeps its stored value, so an editor's save cannot overwrite them either.
 */
const serverWrittenAccess: { create: FieldAccess; update: FieldAccess } = {
  create: (): boolean => false,
  update: (): boolean => false,
};

/**
 * What the mail server answered to each mail sent for the submission.
 */
export const smtpResultsField: Field = {
  name: 'smtpResults',
  type: 'json',
  access: serverWrittenAccess,
  hooks: {
    afterRead: [parseSmtpResultsHook],
  },
  admin: {
    readOnly: true,
    position: 'sidebar',
    components: {
      Field: {
        path: '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-field',
        clientProps: {
          smtpDomain:
            typeof environmentVariables.SMTP_USER === 'string' &&
            (environmentVariables.SMTP_USER.split('@')[1] ?? '').length > 0
              ? environmentVariables.SMTP_USER.split('@')[1]
              : 'cevi.tools',
          systemEmails: [
            typeof environmentVariables.SMTP_USER === 'string'
              ? environmentVariables.SMTP_USER
              : 'noreply@cevi.tools',
          ].filter((email) => email.length > 0),
        },
      },

      Cell: '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-cell',
    },
  },
};

/**
 * The state of each workflow the submission triggered.
 */
export const workflowResultsField: Field = {
  name: 'workflowResults',
  type: 'json',
  access: serverWrittenAccess,
  admin: {
    readOnly: true,
    position: 'sidebar',
    components: {
      Field: {
        path: '@/features/payload-cms/payload-cms/components/workflow-results/workflow-results-field',
      },
      Cell: '@/features/payload-cms/payload-cms/components/workflow-results/workflow-results-cell',
    },
  },
};

/**
 * The helper jobs picked in the form. They count against each job's quota.
 */
export const helperJobsField: Field = {
  name: 'helper-jobs',
  type: 'relationship',
  relationTo: 'helper-jobs',
  hasMany: true,
  access: serverWrittenAccess,
  admin: {
    readOnly: true,
    position: 'sidebar',
  },
};
