import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { Field, GlobalConfig, TextFieldSingleValidation } from 'payload';

/**
 * Validates the link field based on the presence and content of sub-menu items.
 *
 * - If sub-menu items are present: The link field **must be empty**. An error is returned if the link has a value.
 *
 * - If no sub-menu items are present (i.e., `subMenu` is undefined, null, or an empty array): The link field is
 *   **required**. An error is returned if the link is empty.
 *
 * - If a link is provided, it **must be a valid URL** starting with "https://".
 *
 * @param value
 * @param siblingData
 */
const validateLinkWithNested: TextFieldSingleValidation = (
  value,
  {
    siblingData,
  }: {
    siblingData: {
      subMenu?: { label: string; link: string; isExternal: boolean }[];
    };
  },
) => {
  const hasSubMenuItems: boolean =
    siblingData.subMenu !== undefined && siblingData.subMenu.length > 0;
  const isLinkProvided: boolean = value !== undefined && value !== null && value !== '';

  if (hasSubMenuItems) {
    if (isLinkProvided) return 'Link must be empty if sub-menu items are present';
    return true; // Valid: sub-menu present and link is empty.
  } else {
    // No sub-menu items are present.
    if (!isLinkProvided) return 'Link is required if no sub-menu items are present';

    // Link is provided and no sub-menu items, so validate the URL format.
    if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(value ?? '')) {
      return 'Link must be a valid URL starting https://';
    }
    return true; // Valid: no sub-menu, link provided, and URL format is correct.
  }
};

const MainMenu: Field = {
  name: 'mainMenu',
  label: 'Main Menu',
  type: 'array',
  localized: true,
  labels: {
    singular: 'Menu Item',
    plural: 'Menu Items',
  },
  fields: [
    {
      name: 'label',
      label: 'Label',
      type: 'text',
      required: true,
    },
    {
      name: 'link',
      label: 'Link',
      type: 'text',
      required: false,
      validate: validateLinkWithNested,
    },
    {
      name: 'isExternal',
      label: 'Is External Link',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'subMenu',
      label: 'Sub Menu Items',
      type: 'array',
      localized: true,
      labels: {
        singular: 'Sub Menu Item',
        plural: 'Sub Menu Items',
      },
      fields: [
        {
          name: 'label',
          label: 'Label',
          type: 'text',
          required: true,
        },
        {
          name: 'link',
          label: 'Link',
          type: 'text',
          required: true,
        },
        {
          name: 'isExternal',
          label: 'Is External Link',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
};

export const HeaderGlobal: GlobalConfig = {
  slug: 'header',
  label: 'Header Navigation',
  fields: [MainMenu],
  admin: {
    group: AdminPanelDashboardGroups.GlobalSettings,
    description: 'Settings for the header navigation',
  },
};
