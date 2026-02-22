import { environmentVariables } from '@/config/environment-variables';
import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

export const OutgoingEmails: CollectionConfig = {
  slug: 'outgoing-emails',
  admin: {
    useAsTitle: 'subject',
    group: AdminPanelDashboardGroups.GlobalSettings,
    defaultColumns: ['subject', 'to', 'createdAt'],
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
              admin: {
                readOnly: true,
                components: {
                  Field: {
                    path: '@/features/payload-cms/payload-cms/components/smtp-results/smtp-results-field',
                    clientProps: {
                      smtpDomain: environmentVariables.SMTP_USER?.split('@')[1] ?? 'cevi.tools',
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
  ],
};
