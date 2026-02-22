'use client';

import {
  slashMenuGroups,
  toolbarGroups,
} from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field/bigger-paragraph-feature-components';
import { BiggerParagraphNode } from '@/features/payload-cms/payload-cms/shared-fields/rich-text-paragraph-field/bigger-paragraph-node';
import { createClientFeature } from '@payloadcms/richtext-lexical/client';

export const ParagraphFeatureClient = createClientFeature({
  nodes: [BiggerParagraphNode],
  slashMenu: {
    groups: slashMenuGroups,
  },
  toolbarFixed: {
    groups: toolbarGroups,
  },
  toolbarInline: {
    groups: toolbarGroups,
  },
});
