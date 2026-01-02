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
    if (typeof value === 'object' && Object.keys(value).length === 0) {
      return false;
    }
    // If it is a relationship/upload, and the value is an object, it should probably have more than just 'id' or be a valid ref.
    // However, checking keys === 0 is the most critical fix for now causing crashes.
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

  // If we can't find the definition, we assume it's valid to avoid false positives
  if (!blockDefinition) {
    return { isValid: true, missingFields: [], blockLabel: block.blockType };
  }

  const blockLabel = getBlockLabel(blockDefinition, locale);

  for (const field of blockDefinition.fields) {
    if ('name' in field) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const value = (block as any)[field.name];
      if (!validateField(field, value)) {
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
