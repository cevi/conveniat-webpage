import { getValidationMessage } from '@/features/payload-cms/payload-cms/utils/validation-messages';
import type { Validate } from 'payload';

export const isSponsorNamePresent = (siblingData?: Record<string, unknown>): boolean => {
  const name = siblingData?.['name'];
  return Boolean(name && typeof name === 'string' && name.trim() !== '');
};

export const isSponsorMediaPresent = (
  siblingData?: Record<string, unknown>,
  mediaKey: 'image' | 'logo' = 'image',
): boolean => {
  const media = siblingData?.[mediaKey];
  if (!media) return false;
  if (typeof media === 'string') return media.trim() !== '';
  if (typeof media === 'object') return Object.keys(media).length > 0;
  return false;
};

export const createSponsorItemValidation = (mediaKey: 'image' | 'logo' = 'image'): Validate => {
  return (_value, options) => {
    const localeString = options.req.i18n.language;
    const siblingData = options.siblingData as Record<string, unknown> | undefined;

    const hasMedia = isSponsorMediaPresent(siblingData, mediaKey);
    const hasName = isSponsorNamePresent(siblingData);

    if (hasMedia && hasName) {
      return getValidationMessage(localeString, {
        de: 'Es darf nur entweder ein Bild (Logo) oder ein Name angegeben werden, nicht beides.',
        en: 'Only an image (logo) or a name can be provided, not both.',
        fr: 'Seule une image (logo) ou un nom peut être fourni, pas les deux.',
      });
    }

    if (!hasMedia && !hasName) {
      return getValidationMessage(localeString, {
        de: 'Es muss entweder ein Bild (Logo) oder ein Name angegeben werden.',
        en: 'Either an image (logo) or a name must be provided.',
        fr: 'Une image (logo) ou un nom doit être fourni.',
      });
    }

    return true;
  };
};
