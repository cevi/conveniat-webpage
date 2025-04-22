import { callToActionGroupField } from '@/features/payload-cms/payload-cms/shared-blocks/hero-section-block/fields/call-to-action-group-field';
import { pageTeaserField } from '@/features/payload-cms/payload-cms/shared-blocks/hero-section-block/fields/page-teaser-field';
import type { Block } from 'payload';

export const heroSection: Block = {
  slug: 'heroSection',

  imageURL: '/admin-block-images/hero-section-block.png',
  imageAltText: 'Hero section block',

  fields: [pageTeaserField, callToActionGroupField],
};
