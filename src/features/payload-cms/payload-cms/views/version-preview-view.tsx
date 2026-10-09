import type { VersionComparePane } from '@/features/payload-cms/payload-cms/components/version-compare/version-compare-frames';
import { VersionCompareFrames } from '@/features/payload-cms/payload-cms/components/version-compare/version-compare-frames';
import { getAdminLocale } from '@/features/payload-cms/payload-cms/utils/admin-entity-access';
import type { VersionEntry } from '@/features/payload-cms/payload-cms/utils/version-history';
import { toVersionEntry } from '@/features/payload-cms/payload-cms/utils/version-history';
import { generatePreviewUrl } from '@/features/payload-cms/utils/preview/generate-preview-url';
import type { StaticTranslationString } from '@/types/types';
import { generatePreviewToken } from '@/utils/preview-token';
import { SetDocumentStepNav } from '@payloadcms/ui';
import { formatDate } from '@payloadcms/ui/shared';
import { notFound } from 'next/navigation';
import type { DocumentViewServerProps } from 'payload';
import type React from 'react';

const draftLabel: StaticTranslationString = { de: 'Entwurf', en: 'Draft', fr: 'Brouillon' };

const publishedLabel: StaticTranslationString = {
  de: 'Veröffentlicht',
  en: 'Published',
  fr: 'Publié',
};

/** How long the frames may load their version: long enough to read, short enough to share. */
const PREVIEW_TOKEN_SECONDS = 60 * 60;

/**
 * Compares two versions of a document the way a visitor would see them: both rendered by the
 * public site, side by side.
 *
 * Lives next to Payload's version view, which compares the same two versions field by field
 * and stays the place to restore one. Which version to compare with comes from `versionFrom`,
 * the parameter Payload's view uses too, so switching between the two keeps the comparison.
 */
const VersionPreviewView: React.FC<DocumentViewServerProps> = async ({
  doc,
  // `locale` is the content language the document was loaded in, the one the frames show too
  initPageResult: { collectionConfig, docID, locale: contentLocale, permissions, req },
  routeSegments,
  searchParams,
}) => {
  // …/versions/:versionId/preview
  const versionId = routeSegments.at(-2);
  if (collectionConfig === undefined || docID === undefined || versionId === undefined) notFound();
  // A custom document view is reachable with read access alone.
  if (permissions.collections?.[collectionConfig.slug]?.readVersions !== true) notFound();

  const { i18n, payload, user } = req;
  const { config } = payload;
  const adminLocale = getAdminLocale(i18n);

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

  // newest first
  const entries = versions.docs
    .map((version) => toVersionEntry(version))
    .filter((entry) => entry !== undefined);
  const afterIndex = entries.findIndex((entry) => entry.id === versionId);
  const after = entries[afterIndex];
  if (after === undefined) notFound();

  // Compared with the publication before it, so the comparison answers "what changed since this
  // was last live". Failing that, with whatever was saved before.
  const older = entries.slice(afterIndex + 1);
  const requested =
    typeof searchParams?.['versionFrom'] === 'string' ? searchParams['versionFrom'] : undefined;
  const before =
    entries.find((entry) => entry.id === requested && entry.id !== after.id) ??
    older.find((entry) => entry.status === 'published') ??
    older[0];

  const describe = (entry: VersionEntry): string =>
    [
      formatDate({
        date: entry.updatedAt,
        i18n,
        pattern: config.admin.dateFormat,
        timezone: config.admin.timezones.defaultTimezone,
      }),
      entry.status === 'published' ? publishedLabel[adminLocale] : draftLabel[adminLocale],
      entry.editorName,
    ]
      .filter((part) => part !== undefined)
      .join(' · ');

  // The frames show the preview of the public site. Its other key is a cookie the admin panel
  // sets in the browser after the first page has loaded, and that an editor can dismiss; a frame
  // that loads without it would show the published page under the label of a version.
  const previewToken = await generatePreviewToken(String(docID), PREVIEW_TOKEN_SECONDS);
  payload.logger.debug(`Minted a preview token to compare versions of ${String(docID)}`);

  // A page that has no slug in this language still renders: the frame asks for the version
  // by id, the path only has to reach the page route.
  const seo = doc['seo'] as { urlSlug?: unknown } | undefined;
  const urlSlug = typeof seo?.urlSlug === 'string' ? seo.urlSlug : '';

  const toPane = async (entry: VersionEntry): Promise<VersionComparePane> => {
    // The page of the live preview, asked for one stored version. Only the path is kept, so
    // the frame is on the origin the admin panel was opened on and may be read from here.
    const preview = new URL(
      generatePreviewUrl({
        data: { id: String(docID), seo: { urlSlug } },
        collectionConfig,
        ...(contentLocale === undefined ? {} : { locale: contentLocale }),
      }),
      'http://localhost',
    );
    preview.searchParams.set('preview-token', previewToken);
    preview.searchParams.set('previewVersion', entry.id);
    // The page shows a stored version only against a token for that very version.
    preview.searchParams.set(
      'preview-version-token',
      await generatePreviewToken(entry.id, PREVIEW_TOKEN_SECONDS),
    );

    return { id: entry.id, label: describe(entry), url: `${preview.pathname}${preview.search}` };
  };

  const [beforePane, afterPane] = await Promise.all([
    before === undefined ? undefined : toPane(before),
    toPane(after),
  ]);

  return (
    <>
      <SetDocumentStepNav
        collectionSlug={collectionConfig.slug}
        id={docID}
        pluralLabel={collectionConfig.labels.plural}
        useAsTitle={collectionConfig.admin.useAsTitle}
        view={i18n.t('version:versions')}
      />
      <main>
        <VersionCompareFrames
          before={beforePane}
          after={afterPane}
          options={entries
            .filter((entry) => entry.id !== after.id)
            .map((entry) => ({ label: describe(entry), value: entry.id }))}
        />
      </main>
    </>
  );
};

export default VersionPreviewView;
