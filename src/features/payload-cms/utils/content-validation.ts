import type { ContentBlock } from '@/features/payload-cms/converters/page-sections/section-wrapper';
import { mainContentField } from '@/features/payload-cms/payload-cms/shared-fields/main-content-field';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { Block, Field } from 'payload';

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
const blocks = (mainContentField as any).blocks as Block[];

const validateField = (field: Field, value: unknown): boolean => {
  // Check if field is required
  if ('name' in field && 'required' in field && field.required === true) {
    if (value === null || value === undefined) {
      return false;
    }

    // Special check for relationship/upload fields:
    // 1. They might be empty objects `{}` in draft mode.
    // 2. We want to ensure they are at least somewhat populated objects, not just strings (ids) if the component expects objects.
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length === 0) return false;
      } else if (Object.keys(value).length === 0) {
        return false;
      }
      // For image uploads/relationships to images, we expect usage of sizes or url in components
      // If it's a relationship, we can check if it has 'url' property (meaning it's expanded)
      if (('relationTo' in field && field.relationTo === 'images') || field.type === 'upload') {
        if (Array.isArray(value)) {
          if (value.some((item) => typeof item !== 'object' || item === null || !('url' in item))) {
            return false;
          }
        } else if (!('url' in value)) {
          return false;
        }
      }
    }

    if (
      typeof value === 'string' &&
      (field.type === 'upload' || ('relationTo' in field && field.relationTo === 'images'))
    ) {
      return false;
    }
  }
  return true;
};

const getFieldLabel = (field: Field, locale: Locale): string => {
  if (!('label' in field)) return 'Unknown Field';
  const label = field.label as string | StaticTranslationString;

  if (typeof label === 'string') {
    return label;
  }
  // Check if it's a localized object (Record with locale keys)
  if (typeof label === 'object' && locale in label) {
    return (label as Record<string, string>)[locale] || locale;
  }

  // Fallback to name if available
  if ('name' in field) {
    return field.name;
  }

  return 'Unknown Field';
};

const getBlockLabel = (blockDefinition: Block, locale: Locale): string => {
  if (blockDefinition.labels) {
    const labels = blockDefinition.labels;
    if (labels.singular) {
      if (typeof labels.singular === 'string') return labels.singular;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
      return (labels.singular as any)[locale] || (Object.values(labels.singular)[0] as string);
    }
  }
  return blockDefinition.imageAltText || blockDefinition.slug;
};

export const validateContentBlock = (
  block: ContentBlock,
  locale: Locale,
): { isValid: boolean; missingFields: string[]; blockLabel: string } => {
  const blockDefinition = blocks.find((b) => b.slug === block.blockType);
  const missingFields: string[] = [];

  // If we can't find the definition, we flag it as invalid to prevent render crashes
  if (!blockDefinition) {
    console.error(`[ContentValidation] Block definition not found for type: ${block.blockType}`);
    return {
      isValid: false,
      missingFields: ['Block Definition Missing'],
      blockLabel: block.blockType,
    };
  }

  const blockLabel = getBlockLabel(blockDefinition, locale);

  for (const field of blockDefinition.fields) {
    if ('name' in field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const value = (block as any)[field.name];

      let isValid = validateField(field, value);

      // Special requirement for photoCarousel: needs at least 4 images
      if (
        block.blockType === 'photoCarousel' &&
        field.name === 'images' &&
        isValid &&
        (!Array.isArray(value) || value.length < 4)
      ) {
        isValid = false;
      }

      if (!isValid) {
        missingFields.push(getFieldLabel(field, locale));
      }
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields,
    blockLabel,
  };
};
