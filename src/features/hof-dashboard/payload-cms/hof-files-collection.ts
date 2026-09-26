import { fileKindOptions } from '@/features/hof-dashboard/payload-cms/options';
import {
  canReadHofFiles,
  canReviewHofDashboard,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

/** The file types of `HOF_FILE_EXTENSIONS`, for Payload's own check on upload. */
const HOF_FILE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'application/zip',
  'application/x-zip-compressed',
];

/**
 * Every file a Hof hands in on the dashboard, one entry per upload, so an earlier version stays
 * next to the one that replaced it.
 *
 * `hof` repeats the submission's Hof so that serving a file can check it without a lookup: the
 * address administrator of a Hof opens that Hof's files and no other.
 */
export const HofFilesCollection: CollectionConfig = {
  slug: 'hof-files',
  typescript: { interface: 'HofFile' },
  labels: {
    singular: { de: 'Hof-Datei', en: 'Hof file', fr: 'Fichier du Hof' },
    plural: { de: 'Hof-Dateien', en: 'Hof files', fr: 'Fichiers des Hofs' },
  },
  admin: {
    useAsTitle: 'filename',
    group: AdminPanelDashboardGroups.BackofficeHofDashboard.label,
    defaultColumns: ['filename', 'hof', 'kind', 'submission', 'createdAt'],
  },
  access: {
    read: canReadHofFiles,
    create: canReviewHofDashboard,
    update: canReviewHofDashboard,
    delete: isFullAdmin,
  },
  upload: { mimeTypes: HOF_FILE_MIME_TYPES },
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'hof-submissions',
      required: true,
      index: true,
      label: { de: 'Abgabe', en: 'Submission', fr: 'Dépôt' },
    },
    {
      name: 'hof',
      type: 'relationship',
      relationTo: 'hoefe',
      required: true,
      index: true,
      label: { de: 'Hof', en: 'Hof', fr: 'Hof' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      defaultValue: 'plan',
      options: fileKindOptions,
      label: { de: 'Art', en: 'Kind', fr: 'Type' },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      label: { de: 'Hochgeladen von', en: 'Uploaded by', fr: 'Téléversé par' },
      admin: { readOnly: true },
    },
  ],
};
