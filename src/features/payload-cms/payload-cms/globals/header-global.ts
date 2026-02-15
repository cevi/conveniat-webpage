import { LinkField } from '@/features/payload-cms/payload-cms/shared-fields/link-field';
import { flushPageCacheOnChangeGlobal } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { asLocalizedGlobal } from '@/features/payload-cms/payload-cms/utils/localized-global';
import type { Field, GlobalConfig } from 'payload';

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

export const HeaderGlobal: GlobalConfig = asLocalizedGlobal({
  slug: 'header',
  label: 'Header Navigation',
  hooks: { afterChange: [flushPageCacheOnChangeGlobal] },
  fields: [MainMenu],
});
