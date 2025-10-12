'use server';
import type { FeatureSettingsKeyWords } from '@/types/feature-settings';
import config from '@payload-config';
import { getPayload } from 'payload';

/*
 * Utility functions to check if certain features are enabled or disabled.
 * These functions fetch the global settings from Payload CMS and return the status of the requested features.
 * This allows for dynamic feature toggling based on admin configurations.
 */
export const isFeatureEnabled = async (featureKey: FeatureSettingsKeyWords): Promise<boolean> => {
  const payload = await getPayload({ config });

  const settings = await payload.findGlobal({
    slug: 'settings',
    draft: false,
  });

  const value = settings[featureKey] as boolean | undefined;

  return value === true;
};

/*
 * same as above, but for multiple features at once
 * returns a record with the feature keys and their enabled status
 * e.g. { ChatEnableNewChats: true, ChatEnableNewChatsOnlyQR: false }
 */
export const whichFeaturesEnabled = async (
  featureKeys: FeatureSettingsKeyWords[],
): Promise<Record<FeatureSettingsKeyWords, boolean>> => {
  const results: Record<FeatureSettingsKeyWords, boolean> = {} as Record<
    FeatureSettingsKeyWords,
    boolean
  >;

  const payload = await getPayload({ config });

  const settings = await payload.findGlobal({
    slug: 'settings',
    draft: false,
  });

  for (const featureKey of featureKeys) {
    const value = settings[featureKey] as boolean | undefined;
    results[featureKey] = value === true;
  }

  return results;
};
