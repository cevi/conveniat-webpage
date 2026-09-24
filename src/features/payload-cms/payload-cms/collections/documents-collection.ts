import { canAccessDocuments } from '@/features/payload-cms/payload-cms/access-rules/can-access-id-in-collection';
import {
  hasAdminOrWebAccess,
  shouldHideInAdminPanel,
} from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import { LastEditedByUserField } from '@/features/payload-cms/payload-cms/shared-fields/last-edited-by-user-field';
import { permissionsField } from '@/features/payload-cms/payload-cms/shared-fields/permissions-field';
import { buildDocumentContentDisposition } from '@/features/payload-cms/payload-cms/utils/document-download-name';
import { flushPageCacheOnChange } from '@/features/payload-cms/payload-cms/utils/flush-page-cache-on-change';
import type { Document } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { CollectionAfterChangeHook, CollectionConfig, UploadConfig } from 'payload';

const schedulePdfThumbnail: CollectionAfterChangeHook<Document> = async ({ doc, req }) => {
  if (doc.mimeType === 'application/pdf' && req.context['skipPdfThumbnail'] !== true) {
    await req.payload.jobs.queue({
      task: 'generatePdfThumbnail',
      input: { documentId: String(doc.id) },
    });
  }
  return doc;
};

const isEnabledLocale = (locale: string | undefined): locale is Locale =>
  locale !== undefined && i18nConfig.locales.includes(locale);

/**
 * Names the served file after the display name in the requested locale. It only sets a header
 * and returns nothing, so the S3 storage handler registered after it still serves the file.
 */
const nameFileAfterDisplayName: NonNullable<UploadConfig['handlers']>[number] = async (
  request,
  { headers, params },
) => {
  if (headers === undefined) return;

  // the doc Payload hands to handlers is raw (all locales) and absent when access returns true
  const locale = isEnabledLocale(request.locale) ? request.locale : LOCALE.DE;
  try {
    const { docs } = await request.payload.find({
      collection: 'documents',
      where: { filename: { equals: params.filename } },
      locale,
      select: { title: true },
      limit: 1,
      depth: 0,
      pagination: false,
      // read access was already checked by Payload before any handler runs
      overrideAccess: true,
    });
    const contentDisposition = buildDocumentContentDisposition(docs[0]?.title, params.filename);
    if (contentDisposition !== undefined) {
      headers.set('Content-Disposition', contentDisposition);
    }
  } catch (error) {
    // the file is still served, only under its stored name
    request.payload.logger.warn({ err: error, msg: 'Could not resolve document display name' });
  }
};

export const DocumentsCollection: CollectionConfig = {
  slug: 'documents',
  folders: true,
  hooks: { afterChange: [flushPageCacheOnChange, schedulePdfThumbnail] },

  labels: {
    singular: {
      en: 'Document',
      de: 'Dokument',
      fr: 'Document',
    },
    plural: {
      en: 'Documents',
      de: 'Dokumente',
      fr: 'Documents',
    },
  },
  admin: {
    group: AdminPanelDashboardGroups.WebpageMedia.label,
    groupBy: true,
    /** this is broken with our localized versions */
    disableCopyToLocale: true,
    hidden: shouldHideInAdminPanel,
  },
  access: {
    read: canAccessDocuments,
    update: hasAdminOrWebAccess,
    create: hasAdminOrWebAccess,
    delete: hasAdminOrWebAccess,
  },
  fields: [
    {
      name: 'title',
      label: {
        en: 'Display Name',
        de: 'Anzeigename',
        fr: 'Nom affiché',
      },
      type: 'text',
      localized: true,
      admin: {
        description: {
          en: 'Shown to visitors instead of the file name. Leave empty to show the file name.',
          de: 'Wird Besuchenden anstelle des Dateinamens angezeigt. Leer lassen, um den Dateinamen anzuzeigen.',
          fr: 'Affiché aux visiteurs à la place du nom de fichier. Laisser vide pour afficher le nom de fichier.',
        },
      },
    },
    {
      name: 'internalDescription',
      label: {
        en: 'Internal Description',
        de: 'Interne Beschreibung',
        fr: 'Description interne',
      },
      type: 'text',
      admin: {
        description: {
          en: 'Example: for the newsletter',
          de: 'Beispiel: für im Newsletter',
          fr: 'Exemple: pour la newsletter',
        },
      },
    },
    {
      name: 'pdfThumbnailUrl',
      type: 'text',
      admin: {
        hidden: true,
      },
    },
    permissionsField,
    LastEditedByUserField,
  ],
  upload: {
    handlers: [nameFileAfterDisplayName],
    adminThumbnail: ({ doc }) =>
      typeof doc['pdfThumbnailUrl'] === 'string' && doc['pdfThumbnailUrl'].length > 0
        ? doc['pdfThumbnailUrl']
        : false,
  },
};
