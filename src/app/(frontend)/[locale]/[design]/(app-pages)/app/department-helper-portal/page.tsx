import { SetDynamicPageTitle } from '@/components/header/set-dynamic-app-title';
import type { StaticTranslationString } from '@/types/types';
import { getLocaleFromCookies } from '@/utils/get-locale-from-cookies';
import type React from 'react';

const helperShiftsFeatureTranslation: StaticTranslationString = {
  en: 'Helper Shifts',
  de: 'Schichteinsätze',
  fr: "Postes d'aide",
};

/**
 * A placeholder for the helper shifts of a whole Abteilung. Nothing links here yet and it has no
 * content of its own; it only names itself in the header.
 *
 * The locale comes from the cookie: a page is handed `params`, never a `locale` prop, so reading
 * one left the title undefined and the header blank.
 */
const DepartmentHelperPortalPage: React.FC = async () => {
  const locale = await getLocaleFromCookies();

  return <SetDynamicPageTitle newTitle={helperShiftsFeatureTranslation[locale]} />;
};

export default DepartmentHelperPortalPage;
