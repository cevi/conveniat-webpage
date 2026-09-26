import { HOF_SUBMISSION_TYPE_LABELS } from '@/features/hof-dashboard/constants';
import {
  safetyRiskOptions,
  submissionStatusOptions,
  submissionTypeOptions,
} from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { HofSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload';

/** Names the entry after its Hof and what it is, so the list and relationship pickers read. */
const setTitle: CollectionBeforeChangeHook<HofSubmission> = async ({ data, originalDoc, req }) => {
  const hofReference = data.hof ?? originalDoc?.hof;
  const hofId = typeof hofReference === 'object' ? hofReference.id : hofReference;
  const type = data.submissionType ?? originalDoc?.submissionType;
  if (hofId === undefined || type === undefined) return data;
  const hof = await req.payload.findByID({
    collection: 'hoefe',
    id: hofId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    select: { name: true },
    req,
  });
  const typeLabel = HOF_SUBMISSION_TYPE_LABELS[type].de;
  data.title = `${hof?.name ?? hofId} · ${typeLabel}`;
  return data;
};

/**
 * One entry per Hof and kind of plan: what the Hof answered and where the Ressort stands with
 * it. The files themselves are `hof-files` entries, each one a version, joined in below.
 *
 * The Höfe write through the dashboard's tRPC procedures, which check the Hof before they
 * write. Over REST only the reviewers reach it.
 */
export const HofSubmissionsCollection: CollectionConfig = {
  slug: 'hof-submissions',
  typescript: { interface: 'HofSubmission' },
  labels: {
    singular: { de: 'Hof-Abgabe', en: 'Hof submission', fr: 'Dépôt du Hof' },
    plural: { de: 'Hof-Abgaben', en: 'Hof submissions', fr: 'Dépôts des Hofs' },
  },
  admin: {
    useAsTitle: 'title',
    group: AdminPanelDashboardGroups.BackofficeHofDashboard.label,
    defaultColumns: ['title', 'status', 'elevatedSafetyRisk', 'updatedAt'],
    description: {
      en: 'What the Höfe hand in on the Hof dashboard. Set the status and leave feedback here; the Hof sees both on its dashboard.',
      de: 'Was die Höfe auf dem Hof-Dashboard abgeben. Status und Rückmeldung werden hier gesetzt und erscheinen auf dem Dashboard des Hofs.',
      fr: 'Ce que les Hofs déposent sur leur tableau de bord. Le statut et le retour se définissent ici et apparaissent sur le tableau de bord du Hof.',
    },
  },
  access: {
    read: canReviewHofDashboard,
    create: canReviewHofDashboard,
    update: canReviewHofDashboard,
    // the files point at the entry, so removing one is left to the admins
    delete: isFullAdmin,
  },
  indexes: [{ fields: ['hof', 'submissionType'], unique: true }],
  hooks: { beforeChange: [setTitle] },
  fields: [
    {
      name: 'title',
      type: 'text',
      admin: { hidden: true },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'hof',
          type: 'relationship',
          relationTo: 'hoefe',
          required: true,
          index: true,
          label: { de: 'Hof', en: 'Hof', fr: 'Hof' },
          admin: { width: '50%' },
        },
        {
          name: 'submissionType',
          type: 'select',
          required: true,
          options: submissionTypeOptions,
          label: { de: 'Abgabe', en: 'Submission', fr: 'Dépôt' },
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'submitted',
      options: submissionStatusOptions,
      label: { de: 'Status', en: 'Status', fr: 'Statut' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'A new upload by the Hof sets this back to "Submitted".',
          de: 'Lädt der Hof eine neue Version hoch, springt der Status auf "Eingereicht" zurück.',
          fr: 'Un nouveau téléversement du Hof remet le statut sur « Déposé ».',
        },
      },
    },
    {
      name: 'elevatedSafetyRisk',
      type: 'select',
      options: safetyRiskOptions,
      label: {
        de: 'Erhöhtes Sicherheitsrisiko',
        en: 'Elevated safety risk',
        fr: 'Risque de sécurité accru',
      },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Answered by the Hof. With "Yes" the Hof has to hand in a safety concept as well.',
          de: 'Vom Hof beantwortet. Bei "Ja" muss der Hof zusätzlich ein Sicherheitskonzept abgeben.',
          fr: 'Répondu par le Hof. Avec « Oui », le Hof doit aussi déposer un concept de sécurité.',
        },
      },
    },
    {
      name: 'feedback',
      type: 'textarea',
      label: { de: 'Rückmeldung an den Hof', en: 'Feedback to the Hof', fr: 'Retour au Hof' },
      admin: {
        description: {
          en: 'Shown to the Hof on its dashboard, most of all together with "Revision required".',
          de: 'Wird dem Hof auf seinem Dashboard angezeigt, vor allem zusammen mit "Überarbeitung erforderlich".',
          fr: 'Affiché au Hof sur son tableau de bord, surtout avec « Révision nécessaire ».',
        },
      },
    },
    {
      name: 'files',
      type: 'join',
      collection: 'hof-files',
      on: 'submission',
      defaultSort: '-createdAt',
      label: { de: 'Dateien', en: 'Files', fr: 'Fichiers' },
    },
  ],
};
