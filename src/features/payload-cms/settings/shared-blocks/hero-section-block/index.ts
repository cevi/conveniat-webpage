import type { Block } from 'payload';
import { callToActionGroupField } from '@/features/payload-cms/settings/shared-blocks/hero-section-block/fields/call-to-action-group-field';
import { pageTeaserField } from '@/features/payload-cms/settings/shared-blocks/hero-section-block/fields/page-teaser-field';

export const heroSection: Block = {
  slug: 'heroSection',

  imageURL: '/admin-block-images/hero-section-block.png',
  imageAltText: 'Hero section block',

  fields: [pageTeaserField, callToActionGroupField],
};
