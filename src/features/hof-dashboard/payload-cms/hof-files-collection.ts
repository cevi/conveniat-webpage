import { environmentVariables } from '@/config/environment-variables';
import { HOF_FILE_TYPES } from '@/features/hof-dashboard/constants';
import { fileKindOptions } from '@/features/hof-dashboard/payload-cms/options';
import {
  canReadHofFiles,
  canReviewHofDashboard,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

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
    hidden: (): boolean => !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
    description: {
      en: 'Every file the Höfe handed in on the dashboard, one entry per version. The Hof and the submission are set by the upload and cannot be changed.',
      de: 'Jede Datei, die ein Hof auf dem Dashboard abgegeben hat, ein Eintrag pro Version. Hof und Abgabe setzt der Upload, sie lassen sich nicht ändern.',
      fr: 'Chaque fichier déposé par un Hof sur le tableau de bord, une entrée par version. Le Hof et le dépôt sont fixés au téléversement et ne peuvent pas être modifiés.',
    },
  },
  access: {
    read: canReadHofFiles,
    create: canReviewHofDashboard,
    update: canReviewHofDashboard,
    delete: isFullAdmin,
  },
  // Payload checks every file's content against these
  upload: { mimeTypes: [...new Set(Object.values(HOF_FILE_TYPES))] },
  fields: [
    {
      name: 'submission',
      type: 'relationship',
      relationTo: 'hof-submissions',
      required: true,
      index: true,
      label: { de: 'Abgabe', en: 'Submission', fr: 'Dépôt' },
      admin: { readOnly: true },
    },
    {
      name: 'hof',
      type: 'relationship',
      relationTo: 'hoefe',
      required: true,
      index: true,
      label: { de: 'Hof', en: 'Hof', fr: 'Hof' },
      admin: { readOnly: true },
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
