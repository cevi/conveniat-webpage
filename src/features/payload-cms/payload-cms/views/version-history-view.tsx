import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { SelectVersionButton } from '@/features/payload-cms/payload-cms/components/version-history/select-version-button';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type {
  Publication,
  VersionEntry,
} from '@/features/payload-cms/payload-cms/utils/version-history';
import {
  groupVersionHistory,
  toVersionEntry,
} from '@/features/payload-cms/payload-cms/utils/version-history';
import type { Locale, StaticTranslationString } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { Gutter, Pill, SetDocumentStepNav } from '@payloadcms/ui';
import { formatDate } from '@payloadcms/ui/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { DocumentViewServerProps } from 'payload';
import { formatAdminURL } from 'payload/shared';
import type React from 'react';

const pendingTitle: StaticTranslationString = {
  de: 'Noch nicht veröffentlicht',
  en: 'Not published yet',
  fr: 'Pas encore publié',
};

const pendingDescription: StaticTranslationString = {
  de: 'Gespeicherte Änderungen, die nur im Adminpanel sichtbar sind.',
  en: 'Saved changes that are only visible in the admin panel.',
  fr: "Modifications enregistrées, visibles uniquement dans le panneau d'administration.",
};

const liveTitle: StaticTranslationString = { de: 'Live', en: 'Live', fr: 'En ligne' };

const liveDescription: StaticTranslationString = {
  de: 'Dieser Stand ist auf der Webseite sichtbar.',
  en: 'This is what the website shows.',
  fr: 'Cet état est visible sur le site web.',
};

const earlierTitle: StaticTranslationString = {
  de: 'Frühere Veröffentlichungen',
  en: 'Earlier publications',
  fr: 'Publications précédentes',
};

const draftLabel: StaticTranslationString = { de: 'Entwurf', en: 'Draft', fr: 'Brouillon' };

const publishedLabel: StaticTranslationString = {
  de: 'Veröffentlicht',
  en: 'Published',
  fr: 'Publié',
};

const notPublishedLabel: StaticTranslationString = {
  de: 'Nicht veröffentlicht',
  en: 'Not published',
  fr: 'Non publié',
};

const pendingChangesLabel: StaticTranslationString = {
  de: 'Unveröffentlichte Änderungen',
  en: 'Unpublished changes',
  fr: 'Modifications non publiées',
};

const autosavedLabel: StaticTranslationString = {
  de: 'automatisch gespeichert',
  en: 'autosaved',
  fr: 'enregistré automatiquement',
};

const compareWithLiveLabel: StaticTranslationString = {
  de: 'Mit Live-Stand vergleichen',
  en: 'Compare with live',
  fr: 'Comparer avec la version en ligne',
};

const showChangesLabel: StaticTranslationString = {
  de: 'Änderungen ansehen',
  en: 'View changes',
  fr: 'Voir les modifications',
};

const liveLocalesLabel: StaticTranslationString = {
  de: 'Sprachen, die mit diesem Stand live waren',
  en: 'Languages that were live with this version',
  fr: 'Langues en ligne avec cette version',
};

const draftsBeforeLabel: Record<Locale, (count: number) => string> = {
  de: (count) => (count === 1 ? '1 Entwurf davor' : `${count} Entwürfe davor`),
  en: (count) => (count === 1 ? '1 draft before it' : `${count} drafts before it`),
  fr: (count) => (count === 1 ? '1 brouillon avant' : `${count} brouillons avant`),
};

/** A version as the list prints it: every value already formatted. */
interface VersionLine {
  id: string;
  href: string;
  timestamp: string;
  /** Who saved it, and whether it was an autosave. */
  byline: string;
}

interface VersionRowData extends VersionLine {
  publishedLocales: string[];
  drafts: VersionLine[];
}

const readPublishingStatus = (value: unknown): PublishingStatusType => {
  if (typeof value !== 'object' || value === null) return {};
  return value as PublishingStatusType;
};

/*
 * The pieces below are functions that return markup, not components. As components, every row
 * adds entries to the debug info React keeps in development, and its Flight client then copies
 * that list between rows until the browser tab runs out of memory.
 */

/**
 * A version's timestamp: the link that opens it, or inside the "more versions" drawer of
 * Payload's version view the way to pick it as the version to compare with.
 */
const renderTimestamp = (
  line: VersionLine,
  picksVersion: boolean,
  className?: string,
): React.ReactNode =>
  picksVersion ? (
    <SelectVersionButton versionId={line.id}>{line.timestamp}</SelectVersionButton>
  ) : (
    <Link href={line.href} prefetch={false} className={className}>
      {line.timestamp}
    </Link>
  );

/** The drafts behind a row, closed until someone asks for them. */
const renderFoldedDrafts = (
  drafts: VersionLine[],
  locale: Locale,
  picksVersion: boolean,
): React.ReactNode => {
  if (drafts.length === 0) return;

  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-(--theme-elevation-500) select-none">
        {draftsBeforeLabel[locale](drafts.length)}
      </summary>
      <ul className="m-0 mt-2 list-none border-0 border-l border-solid border-(--theme-elevation-150) p-0 pl-4">
        {drafts.map((draft) => (
          <li key={draft.id} className="flex flex-wrap items-baseline gap-x-3 py-1">
            {renderTimestamp(draft, picksVersion)}
            <span className="text-(--theme-elevation-500)">{draft.byline}</span>
          </li>
        ))}
      </ul>
    </details>
  );
};

const renderVersionRow = ({
  row,
  pillStyle,
  pillLabel,
  actionLabel,
  locale,
  picksVersion,
}: {
  row: VersionRowData;
  pillStyle: 'warning' | 'success' | 'light-gray';
  pillLabel: string;
  actionLabel: string;
  locale: Locale;
  picksVersion: boolean;
}): React.ReactNode => (
  <li
    key={row.id}
    className="flex flex-wrap items-start gap-x-6 gap-y-2 border-0 border-t border-solid border-(--theme-elevation-100) px-4 py-3 first:border-t-0"
  >
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {renderTimestamp(row, picksVersion, 'font-medium')}
        <Pill pillStyle={pillStyle} size="small">
          {pillLabel}
        </Pill>
        {row.publishedLocales.length > 0 && (
          <span className="flex gap-1" title={liveLocalesLabel[locale]}>
            {row.publishedLocales.map((code) => (
              <Pill key={code} pillStyle="light-gray" size="small">
                {code.toUpperCase()}
              </Pill>
            ))}
          </span>
        )}
        <span className="text-(--theme-elevation-500)">{row.byline}</span>
      </div>
      {renderFoldedDrafts(row.drafts, locale, picksVersion)}
    </div>
    {!picksVersion && (
      <Link href={row.href} prefetch={false} className="shrink-0">
        {actionLabel}
      </Link>
    )}
  </li>
);

const renderHistorySection = ({
  title,
  description,
  accentClassName,
  rows,
}: {
  title: string;
  description?: string;
  accentClassName: string;
  rows: React.ReactNode;
}): React.ReactNode => (
  <section className="mt-8 first:mt-0">
    <h3 className="m-0 text-xl font-medium text-(--theme-elevation-800)">{title}</h3>
    {description !== undefined && (
      <p className="m-0 mt-1 text-(--theme-elevation-500)">{description}</p>
    )}
    <ul
      className={cn(
        'm-0 mt-3 list-none rounded-sm border border-l-4 border-solid border-(--theme-elevation-150) bg-(--theme-elevation-0) p-0',
        accentClassName,
      )}
    >
      {rows}
    </ul>
  </section>
);

/** Per language: is it live, and does the live page lag behind the draft. */
const renderLanguageStatus = (
  locales: { code: string; label: string }[],
  status: PublishingStatusType,
  locale: Locale,
): React.ReactNode => (
  <ul className="m-0 mb-8 flex list-none flex-wrap gap-x-8 gap-y-2 p-0">
    {locales.map(({ code, label }) => {
      const state = status[code];
      return (
        <li key={code} className="flex items-center gap-2">
          <span className="font-medium text-(--theme-elevation-800)">{label}</span>
          {state?.published === true ? (
            <Pill pillStyle="success" size="small">
              {liveTitle[locale]}
            </Pill>
          ) : (
            <Pill pillStyle="light-gray" size="small">
              {notPublishedLabel[locale]}
            </Pill>
          )}
          {state?.published === true && state.pendingChanges && (
            <Pill pillStyle="warning" size="small">
              {pendingChangesLabel[locale]}
            </Pill>
          )}
        </li>
      );
    })}
  </ul>
);

/**
 * The version history of a localized document.
 *
 * Replaces Payload's flat table of versions, where an autosave and the publication of the same
 * content are two unrelated rows and nothing says which of them is on the website. Here the
 * history is split into what is not published yet, what is live, and what was live before, and
 * the drafts are folded under the publication they led to.
 *
 * Opening a row compares that version against the publication before it: rendered side by side
 * where the collection has a page view, in Payload's own version view everywhere else.
 */
const VersionHistoryView: React.FC<DocumentViewServerProps> = async ({
  doc,
  hasPublishedDoc,
  initPageResult: { collectionConfig, docID, req },
  routeSegments,
  // Set when Payload's version view renders this list in its "more versions" drawer.
  versions: { disableGutter = false, useVersionDrawerCreatedAtCell: picksVersion = false } = {},
}) => {
  if (collectionConfig === undefined || docID === undefined) notFound();

  const { i18n, payload, user } = req;
  const { config } = payload;
  const locale = getAdminLocale(i18n);
  const isTrashed = routeSegments[2] === 'trash';

  const versions = await payload.findVersions({
    collection: collectionConfig.slug,
    // populates the editor, cut down to a name by the `defaultPopulate` of the users collection
    depth: 1,
    locale: 'all',
    overrideAccess: false,
    pagination: false,
    req,
    select: {
      autosave: true,
      createdAt: true,
      updatedAt: true,
      version: { _status: true, _localized_status: true, lastEditedByUser: true },
    },
    sort: '-updatedAt',
    user,
    where: { and: [{ parent: { equals: docID } }, { snapshot: { not_equals: true } }] },
  });

  const { pending, publications } = groupVersionHistory(
    versions.docs.map((version) => toVersionEntry(version)).filter((entry) => entry !== undefined),
  );

  // A collection that can render its versions opens them rendered. Payload answers every path
  // below a trashed document's versions with its own view, so those keep going there.
  const editViews = collectionConfig.admin.components?.views?.edit;
  const hasPageView = editViews !== undefined && 'versionPreview' in editViews && !isTrashed;

  const toLine = (version: VersionEntry, compareWithId?: string): VersionLine => ({
    id: version.id,
    href: formatAdminURL({
      adminRoute: config.routes.admin,
      path: `/collections/${collectionConfig.slug}/${isTrashed ? 'trash/' : ''}${docID}/versions/${version.id}${
        hasPageView ? '/preview' : ''
      }${compareWithId === undefined ? '' : `?versionFrom=${compareWithId}`}`,
    }),
    timestamp: formatDate({
      date: version.updatedAt,
      i18n,
      pattern: config.admin.dateFormat,
      timezone: config.admin.timezones.defaultTimezone,
    }),
    byline: [
      version.editorName,
      version.autosave && version.status === 'draft' ? autosavedLabel[locale] : undefined,
    ]
      .filter((part) => part !== undefined)
      .join(' · '),
  });

  // Opening a publication compares it against the one before, so the diff covers its drafts.
  const publicationRows = publications.map((publication: Publication, index): VersionRowData => ({
    ...toLine(publication.version, publications[index + 1]?.version.id),
    publishedLocales: publication.version.publishedLocales,
    drafts: publication.drafts.map((draft) => toLine(draft)),
  }));

  // `_status` says whether the document as a whole is published, which is what makes the
  // newest publication the live one. After an unpublish there is none.
  const liveRows = hasPublishedDoc ? publicationRows.slice(0, 1) : [];
  const earlierRows = publicationRows.slice(liveRows.length);

  const [pendingHead, ...pendingDrafts] = pending;
  const pendingRow: VersionRowData | undefined =
    pendingHead === undefined
      ? undefined
      : {
          ...toLine(pendingHead, publications[0]?.version.id),
          // A draft carries the status of the document it was saved from, which says nothing
          // about the draft itself.
          publishedLocales: [],
          drafts: pendingDrafts.map((draft) => toLine(draft)),
        };

  const locales =
    config.localization === false
      ? []
      : config.localization.locales.map(({ code, label }) => ({
          code,
          label: typeof label === 'string' ? label : (label[locale] ?? code),
        }));

  const history = (
    <>
      {renderLanguageStatus(locales, readPublishingStatus(doc['publishingStatus']), locale)}

      {versions.docs.length === 0 && (
        <div className="versions__no-versions">{i18n.t('version:noFurtherVersionsFound')}</div>
      )}

      {pendingRow !== undefined &&
        renderHistorySection({
          title: pendingTitle[locale],
          description: pendingDescription[locale],
          accentClassName: 'border-l-(--theme-warning-500)',
          rows: renderVersionRow({
            row: pendingRow,
            pillStyle: 'warning',
            pillLabel: draftLabel[locale],
            actionLabel:
              liveRows.length > 0 ? compareWithLiveLabel[locale] : showChangesLabel[locale],
            locale,
            picksVersion,
          }),
        })}

      {liveRows.length > 0 &&
        renderHistorySection({
          title: liveTitle[locale],
          description: liveDescription[locale],
          accentClassName: 'border-l-(--theme-success-500)',
          rows: liveRows.map((row) =>
            renderVersionRow({
              row,
              pillStyle: 'success',
              pillLabel: publishedLabel[locale],
              actionLabel: showChangesLabel[locale],
              locale,
              picksVersion,
            }),
          ),
        })}

      {earlierRows.length > 0 &&
        renderHistorySection({
          title: earlierTitle[locale],
          accentClassName: 'border-l-(--theme-elevation-250)',
          rows: earlierRows.map((row) =>
            renderVersionRow({
              row,
              pillStyle: 'light-gray',
              pillLabel: publishedLabel[locale],
              actionLabel: showChangesLabel[locale],
              locale,
              picksVersion,
            }),
          ),
        })}
    </>
  );

  return (
    <>
      <SetDocumentStepNav
        collectionSlug={collectionConfig.slug}
        id={docID}
        isTrashed={isTrashed}
        pluralLabel={collectionConfig.labels.plural}
        useAsTitle={collectionConfig.admin.useAsTitle}
        view={i18n.t('version:versions')}
      />
      <main className="versions">
        {/* Payload's drawer brings a gutter of its own. */}
        {disableGutter ? history : <Gutter className="versions__wrap">{history}</Gutter>}
      </main>
    </>
  );
};

export default VersionHistoryView;
