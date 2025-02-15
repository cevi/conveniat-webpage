import { Tab } from 'payload';
import { slugValidation } from '@/payload-cms/collections/blog-article/validation';
import { metaTitle } from '@/payload-cms/shared-tabs/seo-tab/fields/meta-title';
import { metaDescription } from '@/payload-cms/shared-tabs/seo-tab/fields/meta-description';
import { metaKeywords } from '@/payload-cms/shared-tabs/seo-tab/fields/meta-keywords';

/**
 *
 * All routable collections should have a seo tab which defines the
 * SEO properties of the page. This tab should be included in the
 * tabs array of the collection's fields.
 *
 */
export const seoTab: Tab = {
  name: 'seo',
  label: {
    en: 'SEO',
    de: 'SEO',
    fr: 'SEO',
  },
  fields: [
    {
      name: 'urlSlug',
      label: 'URL Slug',
      type: 'text',
      localized: true,
      required: true,
      validate: slugValidation,
      unique: true,
      admin: {
        components: {
          beforeInput: ['@/payload-cms/components/url-field/url-input-field'],
        },
      },
    },

    metaTitle,
    metaDescription,
    metaKeywords,
  ],
};
