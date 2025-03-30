import { Block } from 'payload';
import { callToActionGroupField } from '@/payload-cms/shared-blocks/hero-section-block/fields/call-to-action-group-field';
import { pageTeaserField } from '@/payload-cms/shared-blocks/hero-section-block/fields/page-teaser-field';

export const heroSection: Block = {
  slug: 'heroSection',

  imageURL: '/admin-block-images/hero-section-block.png',
  imageAltText: 'Hero section block',

  fields: [pageTeaserField, callToActionGroupField],
};
