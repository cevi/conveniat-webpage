import {
  hasAdminOrWebAccess,
  ProgramTeamAccessForGenericPage,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { trackSlugHistory } from '@/features/payload-cms/payload-cms/hooks/track-slug-history';
import { AllowsEditsByUserField } from '@/features/payload-cms/payload-cms/shared-fields/allows-edits-by-user-field';
import { internalAuthorsField } from '@/features/payload-cms/payload-cms/shared-fields/internal-authors-field';
import { internalPageNameField } from '@/features/payload-cms/payload-cms/shared-fields/internal-page-name-field';
import { internalStatusField } from '@/features/payload-cms/payload-cms/shared-fields/internal-status-field';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import { pageTitleField } from '@/features/payload-cms/payload-cms/shared-fields/page-title-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import { releaseDate } from '@/features/payload-cms/payload-cms/shared-fields/release-date-field';
import { seoTab } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import { linkTargetPopulate } from '@/features/payload-cms/payload-cms/utils/link-target-populate';
import { asLocalizedCollection } from '@/features/payload-cms/payload-cms/utils/localized-collection';
import type { CollectionConfig } from 'payload';

export const GenericPage: CollectionConfig = asLocalizedCollection({
  slug: 'generic-page',
  trash: true,
  hooks: { beforeChange: [trackSlugHistory], afterChange: [flushPageCacheOnChange] },

  labels: {
    singular: {
      en: 'Page',
      de: 'Seite',
      fr: 'Page',
    },
    plural: {
      en: 'Pages',
      de: 'Seiten',
      fr: 'Pages',
    },
  },
  defaultSort: 'internalPageName',
  defaultPopulate: linkTargetPopulate,
  admin: {
    group: AdminPanelDashboardGroups.WebpageContent.label,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    useAsTitle: 'internalPageName',
    defaultColumns: [
      'internalPageName',
      'internalStatus',
      'authors',
      'publishingStatus',
      'updatedAt',
      'seo-urlSlug',
    ],
    listSearchableFields: ['internalPageName', 'seo.metaTitle', 'seo.urlSlug'],
    pagination: {
      defaultLimit: 10,
      limits: [10, 20, 50],
    },
    components: {
      views: {
        edit: {
          // two versions rendered side by side, next to Payload's field by field comparison
          versionPreview: {
            Component: '@/features/payload-cms/payload-cms/views/version-preview-view',
            path: '/versions/:versionId/preview',
            tab: {
              Component:
                '@/features/payload-cms/payload-cms/components/version-compare/version-compare-tabs#VersionCompareTabs',
              // right after "Versions"
              order: 310,
            },
          },
        },
      },
    },
  },

  access: {
    read: ProgramTeamAccessForGenericPage,
    // The program team edits the pages it was named on, it does not add or remove pages.
    create: hasAdminOrWebAccess,
    update: ProgramTeamAccessForGenericPage,
    delete: hasAdminOrWebAccess,
    // do we need readVersions?
  },

  fields: [
    internalPageNameField,
    internalAuthorsField,
    internalStatusField,
    {
      type: 'tabs',
      tabs: [
        {
          name: 'content',
          label: {
            en: 'Content',
            de: 'Seiteninhalt',
            fr: 'Contenu',
          },
          fields: [pageTitleField, permissionsField, releaseDate, mainContentField],
        },
        seoTab({ collectionSlugDE: '', collectionSlugEN: '', collectionSlugFR: '' }),
      ],
    },
    LastEditedByUserField,
    AllowsEditsByUserField,
  ],
});
