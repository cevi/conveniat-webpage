import { Block } from 'payload';
import { callToActionGroupField } from '@/payload-cms/shared-blocks/hero-section-block/fields/call-to-action-group-field';
import { pageTeaserField } from '@/payload-cms/shared-blocks/hero-section-block/fields/page-teaser-field';

export const heroSection: Block = {
  slug: 'heroSection',
  fields: [pageTeaserField, callToActionGroupField],
};
