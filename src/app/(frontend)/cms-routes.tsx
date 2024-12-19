import { LocalizedPage } from '@/content-pages/localized-page';
import React, { ReactElement } from 'react';
import { ImprintPage } from '@/content-pages/imprint/page';
import { PrivacyPage } from '@/content-pages/privacy/page';

/*
 *
 * TODO: this should be abstracted using a wrapper function around the GlobalsDefinition
 *
 * Currently we have to define the global URL resolution for each global here,
 * while there is already a definition of the urlSlug in the corresponding Global.
 *
 * We should therefore replace this definition with wrapper functions that
 * extract the global URL resolution from the GlobalsDefinition.
 *
 * `asRoutable(
 *     config,
 *     {de: 'impressum, 'en': 'imprint, 'fr': 'mentions-legales'},
 *     reactPageComponent
 * )`
 *
 * Where config is for example the ImprintGlobal object. The wrapper then sets both the urlSlug
 * field (marked as readonly in the admin panel) and the global URL resolution used here to
 * resolve to the correct DB object.
 *
 */

/**
 * Global URL resolution for each locale
 *
 * @deprecated - will be replaced by another abstraction soonish
 */
export const CMS_ROUTES: {
  [locale in 'de' | 'en' | 'fr']: { [slug: string]: ReactElement<LocalizedPage> };
} = {
  de: {
    impressum: <ImprintPage locale="de" />,
    datenschutz: <PrivacyPage locale="de" />,
  },
  en: {
    imprint: <ImprintPage locale="en" />,
    privacy: <PrivacyPage locale="en" />,
  },
  fr: {
    'mentions-legales': <ImprintPage locale="fr" />,
    'protection-donnees': <PrivacyPage locale="fr" />,
  },
};
