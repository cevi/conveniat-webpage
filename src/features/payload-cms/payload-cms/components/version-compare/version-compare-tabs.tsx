'use client';

import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Button, useTranslation } from '@payloadcms/ui';
import { usePathname, useSearchParams } from 'next/navigation';
import type React from 'react';

const pageViewLabel: StaticTranslationString = {
  de: 'Seitenansicht',
  en: 'Page view',
  fr: 'Vue de la page',
};

const fieldViewLabel: StaticTranslationString = {
  de: 'Feldansicht',
  en: 'Field view',
  fr: 'Vue des champs',
};

/** Matches the two views of a single version, and captures the path they share. */
const VERSION_PATH = /^(.+\/versions\/[^/]+?)(\/preview)?$/;

/**
 * Two extra document tabs, shown while a single version is open: the rendered comparison and
 * Payload's field by field one.
 *
 * Payload's version view has no slot for a control of its own, and it cannot be wrapped either,
 * since `@payloadcms/next` does not export it. The document tabs are the one place both views
 * share, so the switch between them lives here.
 */
export const VersionCompareTabs: React.FC = () => {
  const { i18n } = useTranslation();
  const locale = resolveAdminLocale(i18n.language);
  const pathname = usePathname();
  const searchParameters = useSearchParams();

  const match = VERSION_PATH.exec(pathname);
  // Payload serves its own version view for every path below a trashed document's versions.
  if (match === null || pathname.includes('/trash/')) return <></>;

  const versionPath = match[1] ?? '';
  const isPageView = match[2] !== undefined;

  // Both views read the version to compare with from the same parameter, so it carries over.
  const kept = new URLSearchParams();
  for (const name of ['versionFrom', 'locale']) {
    const value = searchParameters.get(name);
    if (value !== null) kept.set(name, value);
  }
  const query = kept.size > 0 ? `?${kept.toString()}` : '';

  const tabs = [
    { label: pageViewLabel[locale], href: `${versionPath}/preview${query}`, active: isPageView },
    { label: fieldViewLabel[locale], href: `${versionPath}${query}`, active: !isPageView },
  ];

  return (
    <>
      {tabs.map(({ label, href, active }) => (
        <Button
          key={href}
          aria-label={label}
          buttonStyle="tab"
          className={cn('doc-tab', { 'doc-tab--active': active })}
          disabled={active}
          el={active ? 'div' : 'link'}
          margin={false}
          size="medium"
          {...(active ? {} : { to: href })}
        >
          <span className="doc-tab__label">{label}</span>
        </Button>
      ))}
    </>
  );
};
