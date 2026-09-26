import config from '@payload-config';
import { getPayload } from 'payload';

/**
 * Resolves the name this deployment presents itself under, for text the operating
 * system shows outside the app, such as a push notification title.
 *
 * conveniat27 and konekta ship from one tree, so the name cannot be a literal. It is
 * the PWA global's short name, the same value the manifest hands the installed app.
 *
 * @returns {Promise<string>} The deployment's app short name, e.g. `conveniat27`.
 */
export const getAppShortName = async (): Promise<string> => {
  const payload = await getPayload({ config });
  const { appShortName } = await payload.findGlobal({ slug: 'PWA' });
  return appShortName;
};
