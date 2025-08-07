import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { localizedStatusSchema } from '@/features/payload-cms/payload-cms/utils/localized-status-schema';
import type { Field, GlobalConfig } from 'payload';
import { getPublishingStatusGlobal } from '../hooks/publishing-status';

const MainMenu: Field = {
  name: 'mainMenu',
  label: 'Main Menu',
  type: 'array',
  localized: true,
  admin: {
    components: {
      RowLabel: {
        path: '@/features/payload-cms/payload-cms/components/main-menu-row-label#MainEntryRowLabel',
      },
    },
  },
  fields: [
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
    },
    {
      ...LinkField(false),
      admin: {
        condition: (_, siblingData) =>
          !siblingData['subMenu'] || (siblingData['subMenu'] as Field[]).length === 0,
      },
    },
    {
      name: 'subMenu',
      label: 'Sub Menu Items',
      admin: {
        components: {
          RowLabel: {
            path: '@/features/payload-cms/payload-cms/components/main-menu-row-label#MainEntryRowLabel',
          },
        },
      },
      type: 'array',
      localized: true,
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
        },
        LinkField(),
      ],
    },
  ],
};

export const HeaderGlobal: GlobalConfig = {
  slug: 'header',
  label: 'Header Navigation',
  fields: [
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
        create: () => false,
        update: () => false,
      },
      virtual: true,
      hooks: {
        afterRead: [getPublishingStatusGlobal('header')],
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
    MainMenu,
  ],
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: 'Settings for the header navigation',
    components: {
      elements: {
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
};
