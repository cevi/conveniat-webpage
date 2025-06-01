import { canAccessAdminPanel } from '@/features/payload-cms/payload-cms/access-rules/can-access-admin-panel';
import { getPublishingStatus } from '@/features/payload-cms/payload-cms/hooks/publishing-status';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder';
import type { BlocksField, Field, TextField } from 'payload';

export const formPluginConfiguration = formBuilderPlugin({
  fields: {
    state: false, // we do not use states in CH
  },
  formOverrides: {
    access: {
      read: canAccessAdminPanel,
    },
    defaultPopulate: {
      versions: false,
    },
    admin: {
      defaultColumns: ['id', 'publishingStatus', 'title'],
      components: {
        beforeList: [
          '@/features/payload-cms/payload-cms/components/disable-actions/disable-many-actions',
        ],
        edit: {
          beforeDocumentControls: [
            {
              path: '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status-client',
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
      drafts: {
        autosave: {
          interval: 300,
        },
      },
    },
    fields: ({ defaultFields }) => {
      const reactionFieldNames = new Set([
        'emails',
        'redirect',
        'confirmationMessage',
        'confirmationType',
      ]);
      const reactionFields = defaultFields.filter(
        (field: Field) =>
          'name' in field && reactionFieldNames.has(field.name) && field.name !== 'title',
      );

      const formFields = defaultFields.filter(
        (field: Field) =>
          'name' in field && !reactionFieldNames.has(field.name) && field.name !== 'title',
      );

      const titleField = defaultFields.find(
        (field: Field) => 'name' in field && field.name === 'title',
      ) as TextField;

      titleField.label = {
        en: 'Form Title',
        de: 'Formular Titel',
        fr: 'Titre du formulaire',
      };

      // render form fields with initCollapsed
      const fields = formFields.find(
        (field: Field) => 'name' in field && field.name === 'fields',
      ) as BlocksField;
      fields.admin ??= {};
      fields.admin.initCollapsed = true;

      return [
        titleField,
        {
          type: 'tabs',
          tabs: [
            {
              label: {
                en: 'Form Fields',
                de: 'Formularfelder',
                fr: 'Champs du formulaire',
              },
              fields: formFields,
            },
            {
              label: {
                en: 'Confirmation / Submission Settings',
                de: 'Bestätigungs- / Einreichungseinstellungen',
                fr: 'Paramètres de confirmation / soumission',
              },
              fields: reactionFields,
            },
            {
              label: {
                en: 'Submissions',
                de: 'Ergebnisse',
                fr: 'Soumissions',
              },
              fields: [
                {
                  name: 'submissions',
                  type: 'join',
                  collection: 'form-submissions',
                  on: 'form',
                  admin: {
                    allowCreate: false,
                  },
                },
              ],
            },
          ],
        },
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
              getPublishingStatus({
                slug: 'forms',
                fields: [...defaultFields],
              }),
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
    },
  },
});
