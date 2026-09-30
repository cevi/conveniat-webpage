import { resolveAdminLocale } from '@/features/payload-cms/payload-cms/components/shared/resolve-admin-locale';
import type { ConfigLabel } from '@/features/payload-cms/payload-cms/utils/document-references';
import type { DocumentUsage } from '@/features/payload-cms/payload-cms/utils/find-document-usages';
import {
  countDocumentUsages,
  findDocumentUsages,
} from '@/features/payload-cms/payload-cms/utils/find-document-usages';
import type { Locale, StaticTranslationString } from '@/types/types';
import { Pill } from '@payloadcms/ui';
import { Globe, Link2 } from 'lucide-react';
import Link from 'next/link';
import type { DefaultServerCellComponentProps, UIFieldServerProps } from 'payload';
import type React from 'react';

const usageLabel: StaticTranslationString = {
  en: 'Used in',
  de: 'Verwendet in',
  fr: 'Utilisé dans',
};

const linkedFromLabel: StaticTranslationString = {
  en: 'Linked from {count} places',
  de: 'Von {count} Stellen verlinkt',
  fr: 'Lié depuis {count} endroits',
};

const unlinkedLabel: StaticTranslationString = {
  en: 'Not linked',
  de: 'Nicht verlinkt',
  fr: 'Non lié',
};

const notUsedLabel: StaticTranslationString = {
  en: 'Not linked anywhere.',
  de: 'Nirgends verlinkt.',
  fr: 'Lié nulle part.',
};

const usageDescription: StaticTranslationString = {
  en: 'Pages, blog posts, the Hof dashboard and other content that link to this document, published or in a newer draft.',
  de: 'Seiten, Blogartikel, das Hof-Dashboard und weitere Inhalte, die veröffentlicht oder in einem neueren Entwurf auf dieses Dokument verweisen.',
  fr: 'Pages, articles de blog, le tableau de bord des Hofs et autres contenus qui renvoient à ce document, publiés ou dans un brouillon plus récent.',
};

const translate = (label: ConfigLabel, locale: Locale): string =>
  typeof label === 'string'
    ? label
    : (label[locale] ?? label['de'] ?? Object.values(label)[0] ?? '');

/** Every field path of one usage with the locales it references the document in. */
const groupByPath = (
  usage: DocumentUsage,
  locale: Locale,
): { path: string; locales: Locale[] }[] => {
  const paths = new Map<string, Set<Locale>>();
  for (const reference of usage.references) {
    const path = reference.path.map((segment) => translate(segment, locale)).join(' › ');
    const locales = paths.get(path) ?? new Set<Locale>();
    if (reference.locale !== undefined) locales.add(reference.locale);
    paths.set(path, locales);
  }
  return [...paths].map(([path, locales]) => ({ path, locales: [...locales].sort() }));
};

const UsageEntry: React.FC<{ usage: DocumentUsage; locale: Locale }> = ({ usage, locale }) => (
  <li className="flex flex-col gap-1 border-t border-(--theme-elevation-100) py-2 first:border-t-0">
    <Link href={usage.adminUrl} className="font-semibold">
      {translate(usage.title ?? usage.groupLabel, locale)}
    </Link>
    {groupByPath(usage, locale).map(({ path, locales }) => (
      <div key={path} className="flex flex-wrap items-center gap-1">
        <span className="text-sm text-(--theme-elevation-500)">{path}</span>
        {locales.map((referenceLocale) => (
          <Pill key={referenceLocale} pillStyle="light-gray" size="small">
            {referenceLocale.toUpperCase()}
          </Pill>
        ))}
      </div>
    ))}
    {usage.publicUrls.map(({ locale: urlLocale, url }) => (
      <a
        key={urlLocale}
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-sm break-all"
      >
        <Globe aria-hidden="true" className="size-3.5 shrink-0" />
        {url}
      </a>
    ))}
  </li>
);

/**
 * Sidebar list of the pages, globals and other documents that reference a document, with links to
 * their edit views and to their public pages.
 */
export const DocumentUsageField = async ({
  id,
  i18n,
  payload,
}: UIFieldServerProps): Promise<React.ReactElement> => {
  // a document that is being created is not referenced yet
  if (typeof id !== 'string') return <></>;

  const locale = resolveAdminLocale(i18n.language);
  const usages = await findDocumentUsages(payload, id);

  const groups = new Map<string, DocumentUsage[]>();
  for (const usage of usages) {
    const group = translate(usage.groupLabel, locale);
    groups.set(group, [...(groups.get(group) ?? []), usage]);
  }

  return (
    <div className="mb-8 text-base">
      <div className="font-semibold">{usageLabel[locale]}:</div>
      {usages.length === 0 && <div>{notUsedLabel[locale]}</div>}
      {[...groups].map(([group, groupUsages]) => (
        <div key={group} className="mt-3">
          <div className="text-sm text-(--theme-elevation-500) uppercase">{group}</div>
          <ul className="m-0 list-none p-0">
            {groupUsages.map((usage) => (
              <UsageEntry key={usage.adminUrl} usage={usage} locale={locale} />
            ))}
          </ul>
        </div>
      ))}
      <p className="mt-1 text-sm text-(--theme-elevation-500)">{usageDescription[locale]}</p>
    </div>
  );
};

/**
 * List column with the number of pages, globals and other documents that reference a document.
 * Every row reads the same scan, which runs once per request.
 */
export const DocumentUsageCell = async ({
  rowData,
  i18n,
  payload,
}: DefaultServerCellComponentProps): Promise<React.ReactElement> => {
  // Payload also renders a ui field's Cell while building the edit view's form state, with no row
  const row = rowData as DefaultServerCellComponentProps['rowData'] | undefined;
  const documentId: unknown = row?.['id'];
  if (typeof documentId !== 'string') return <></>;

  const counts = await countDocumentUsages(payload);
  const count = counts.get(documentId) ?? 0;
  const locale = resolveAdminLocale(i18n.language);

  if (count === 0) {
    return <span className="text-(--theme-elevation-400)">{unlinkedLabel[locale]}</span>;
  }
  return (
    <span
      className="inline-flex items-center gap-1 tabular-nums"
      title={linkedFromLabel[locale].replace('{count}', String(count))}
    >
      <Link2 aria-hidden="true" className="size-3.5" />
      {count}
    </span>
  );
};
