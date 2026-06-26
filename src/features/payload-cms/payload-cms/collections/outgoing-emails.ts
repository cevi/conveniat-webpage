import { environmentVariables } from '@/config/environment-variables';
import {
  hasAccessToThisHelper,
  Roles,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { overrideOutgoingEmailStatusHandler } from '@/features/payload-cms/payload-cms/endpoints/override-outgoing-email';
import { resendOutgoingEmailHandler } from '@/features/payload-cms/payload-cms/endpoints/resend-outgoing-email';
import { parseSmtpResultsHook } from '@/features/payload-cms/payload-cms/hooks/parse-smtp-results';
import type { CollectionConfig, FieldHook } from 'payload';

export const OutgoingEmails: CollectionConfig = {
  slug: 'outgoing-emails',
  labels: {
    singular: {
      en: 'Outgoing Email',
      de: 'Ausgehende E-Mail',
      fr: 'E-mail sortant',
    },
    plural: {
      en: 'Outgoing Emails',
      de: 'Ausgehende E-Mails',
      fr: 'E-mails sortants',
    },
  },
  admin: {
    useAsTitle: 'subject',
    group: AdminPanelDashboardGroups.GlobalSettings,
    groupBy: true,
    defaultColumns: [
      'subject',
      'to',
      'type',
      'form',
      'deliveryStatus',
      'smtpReceivedAt',
      'dsnReceivedAt',
      'createdAt',
    ],
  },
  access: {
    // read only for admins, only access programmatically
    read: hasAccessToThisHelper({ requiredRoles: [Roles.FullAdmin] }),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  hooks: {
    beforeOperation: [
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      ({ args, operation }): void => {
        if (
          (operation === 'find' || operation === 'findByID') &&
          (args.depth === undefined || args.depth === 0)
        ) {
          args.depth = 1;
        }
      },
    ],
  },
  endpoints: [
    {
      path: '/:id/resend',
      method: 'post',
      handler: resendOutgoingEmailHandler,
    },
    {
      path: '/:id/override-status',
      method: 'post',
      handler: overrideOutgoingEmailStatusHandler,
    },
  ],
  fields: [
    {
      name: 'deliveryStatus',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
      ],
      defaultValue: 'pending',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
      index: true,
    },
    {
      name: 'resendAction',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field:
            '@/features/payload-cms/payload-cms/components/resend-email/resend-email-button#ResendEmailButton',
        },
      },
    },
    {
      name: 'overrideStatusAction',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: {
          Field: {
            path: '@/features/payload-cms/payload-cms/components/override-status/override-status-button#OverrideStatusButton',
            clientProps: {
              fullAdminGroupIds: environmentVariables.CEVIDB_GROUP_FULL_ADMIN,
            },
          },
        },
      },
    },
    {
      name: 'dsnReceivedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'smtpReceivedAt',
      type: 'date',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'to',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'subject',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
      },
    },
    {
      name: 'formSubmission',
      type: 'relationship',
      relationTo: 'form-submissions',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'billParticipant',
      type: 'relationship',
      relationTo: 'bill-participants',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'type',
      label: {
        en: 'Type',
        de: 'Typ',
        fr: 'Type',
      },
      type: 'select',
      virtual: true,
      options: [
        {
          label: {
            en: 'Form Submission',
            de: 'Formular Antwort',
            fr: 'Soumission de formulaire',
          },
          value: 'formSubmission',
        },
        {
          label: {
            en: 'Bill Participant',
            de: 'Rechnungsteilnehmer',
            fr: 'Participant à la facture',
          },
          value: 'billParticipant',
        },
        {
          label: {
            en: 'Other',
            de: 'Andere',
            fr: 'Autre',
          },
          value: 'other',
        },
      ],
      admin: {
        readOnly: true,
      },
      hooks: {
        afterRead: [
          (({ data }): string => {
            const safeData = (data ?? {}) as Record<string, unknown>;
            const formSubmission = safeData['formSubmission'];
            const billParticipant = safeData['billParticipant'];
            if (formSubmission !== undefined && formSubmission !== null) {
              return 'formSubmission';
            }
            if (billParticipant !== undefined && billParticipant !== null) {
              return 'billParticipant';
            }
            return 'other';
          }) as FieldHook,
        ],
      },
    },
    {
      name: 'form',
      label: {
        en: 'Form',
        de: 'Formular',
        fr: 'Formulaire',
      },
      type: 'relationship',
      relationTo: 'forms',
      virtual: true,
      admin: {
        readOnly: true,
      },
      hooks: {
        afterRead: [
          (async ({ data, req }): Promise<string | undefined> => {
            const safeData = (data ?? {}) as Record<string, unknown>;
            const formSubmission = safeData['formSubmission'];
            if (formSubmission === undefined || formSubmission === null) return undefined;

            // Fast path: if formSubmission is already eagerly populated, extract the form ID directly
            if (typeof formSubmission === 'object' && 'form' in formSubmission) {
              const formValue = (formSubmission as Record<string, unknown>)['form'];
              if (formValue !== undefined && formValue !== null) {
                return typeof formValue === 'object' && 'id' in formValue
                  ? (formValue as { id: string }).id
                  : (formValue as string);
              }
            }

            const formSubmissionId =
              typeof formSubmission === 'object' && 'id' in formSubmission
                ? (formSubmission as { id: string }).id
                : (formSubmission as string);

            if (typeof formSubmissionId !== 'string' || formSubmissionId === '') return undefined;

            try {
              const submission = await req.payload.findByID({
                collection: 'form-submissions',
                id: formSubmissionId,
                depth: 0,
              });
              const formValue = submission['form'] as unknown;
              if (formValue !== undefined && formValue !== null) {
                return typeof formValue === 'object' && 'id' in formValue
                  ? (formValue as { id: string }).id
                  : (formValue as string);
              }
            } catch (error) {
              console.error('Error fetching form submission inside form afterRead hook:', error);
            }
            return undefined;
          }) as FieldHook,
        ],
      },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: {
            en: 'Overview',
            de: 'Übersicht',
            fr: 'Aperçu',
          },
          fields: [
            {
              name: 'html',
              type: 'textarea',
              admin: {
                readOnly: true,
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/email-preview/email-preview-field',
                },
              },
            },
            {
              name: 'smtpResults',
              type: 'json',
              hooks: {
                afterRead: [parseSmtpResultsHook],
              },
              admin: {
                readOnly: true,
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
            },
          ],
        },
        {
          label: {
            en: 'Details',
            de: 'Details',
            fr: 'Détails',
          },
          fields: [
            {
              name: 'rawSmtpResults',
              type: 'json',
              admin: {
                readOnly: true,
                components: {
                  Field:
                    '@/features/payload-cms/payload-cms/components/smtp-results/raw-smtp-results-field',
                },
              },
            },
            {
              name: 'rawDsnEmail',
              type: 'textarea',
              admin: {
                readOnly: true,
              },
            },
          ],
        },
      ],
    },
    {
      name: 'createdAt',
      type: 'date',
      index: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'lastRetriggeredBy',
      type: 'relationship',
      relationTo: 'users',
      hasMany: false,
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
  ],
};
