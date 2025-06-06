import type { CustomSlugComponentProperties } from '@/features/payload-cms/payload-cms/components/slug/types';
import { SlugField } from '@/features/payload-cms/payload-cms/shared-fields/slug-field';
import { metaDescription } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab/fields/meta-description';
import { metaKeywords } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab/fields/meta-keywords';
import { metaTitle } from '@/features/payload-cms/payload-cms/shared-tabs/seo-tab/fields/meta-title';
import type { Tab } from 'payload';

/**
 *
 * All routable collections should have a seo tab which defines the
 * SEO properties of the page. This tab should be included in the
 * tabs array of the collection's fields.
 *
 */
export const seoTab = (properties: CustomSlugComponentProperties): Tab => ({
  name: 'seo',
  label: {
    en: 'SEO',
    de: 'SEO',
    fr: 'SEO',
  },
  fields: [SlugField(properties), metaTitle, metaDescription, metaKeywords],
});
