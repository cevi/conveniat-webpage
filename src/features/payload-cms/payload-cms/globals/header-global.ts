import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { Field, GlobalConfig, TextFieldSingleValidation } from 'payload';

const validateLink: TextFieldSingleValidation = (link) => {
  // Check if the link is provided
  if (link === null || link === undefined || link.trim() === '') {
    return 'Link is required';
  }

  // Validate the URL format, starting with / or https://
  const urlPattern = /^(https?:\/\/|\/)[^\s/$.?#].[^\s]*$/;
  if (!urlPattern.test(link)) {
    return 'Link must be a valid URL starting with https:// or /';
  }

  return true; // Valid link
};

interface SubMenuItem {
  label: string;
  link: string;
  isExternal: boolean;
}

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
 * @param link
 * @param options
 */
const validateLinkWithNested: TextFieldSingleValidation = (link, options) => {
  const subMenu = (
    options.siblingData as {
      subMenu?: SubMenuItem[] | undefined;
    }
  ).subMenu;

  const hasSubMenuItems: boolean = subMenu !== undefined && subMenu.length > 0;
  const isLinkProvided: boolean = link !== undefined && link !== null && link !== '';

  if (hasSubMenuItems) {
    if (isLinkProvided) return 'Link must be empty if sub-menu items are present';
    return true; // Valid: sub-menu present and link is empty.
  } else {
    // No sub-menu items are present.
    if (!isLinkProvided) return 'Link is required if no sub-menu items are present';

    return validateLink(link, options); // Validate the link format.
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
          validate: validateLink,
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
