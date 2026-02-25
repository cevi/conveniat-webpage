import { environmentVariables } from '@/config/environment-variables';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { parseSmtpResultsHook } from '@/features/payload-cms/payload-cms/hooks/parse-smtp-results';
import type { CollectionConfig } from 'payload';

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
    defaultColumns: [
      'subject',
      'to',
      'deliveryStatus',
      'smtpReceivedAt',
      'dsnReceivedAt',
      'createdAt',
    ],
  },
  access: {
    // read only for admins, only access programmatically
    read: canAccessAdminPanel,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
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
  ],
};
