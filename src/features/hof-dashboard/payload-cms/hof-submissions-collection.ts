import { environmentVariables } from '@/config/environment-variables';
import {
  safetyRiskOptions,
  submissionStatusOptions,
  submissionTypeOptions,
} from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import { isFullAdmin } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { AdminPanelDashboardGroups } from '@/features/payload-cms/payload-cms/admin-panel-dashboard-groups';
import type { CollectionConfig } from 'payload';

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
    defaultColumns: ['hof', 'submissionType', 'status', 'elevatedSafetyRisk', 'updatedAt'],
    hidden: (): boolean => !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
    description: {
      en: 'What the Höfe hand in on the Hof dashboard. Set the status and leave feedback here; the Hof sees both on its dashboard.',
      de: 'Was die Höfe auf dem Hof-Dashboard abgeben. Status und Rückmeldung werden hier gesetzt und erscheinen auf dem Dashboard des Hofs.',
      fr: 'Ce que les Hofs déposent sur leur tableau de bord. Le statut et le retour se définissent ici et apparaissent sur le tableau de bord du Hof.',
    },
  },
  access: {
    read: canReviewHofDashboard,
    // only the dashboard's tRPC procedures create these, through the local API
    create: () => false,
    update: canReviewHofDashboard,
    // the files point at the entry, so removing one is left to the admins
    delete: isFullAdmin,
  },
  indexes: [{ fields: ['hof', 'submissionType'], unique: true }],
  fields: [
    {
      // set when the entry is made, so the admin's headings and pickers read "Hof Nord · …"
      name: 'title',
      type: 'text',
      label: { de: 'Titel', en: 'Title', fr: 'Titre' },
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
          // set by the dashboard; moving an entry would strand its files at the old Hof
          admin: { width: '50%', readOnly: true },
        },
        {
          name: 'submissionType',
          type: 'select',
          required: true,
          options: submissionTypeOptions,
          label: { de: 'Abgabe', en: 'Submission', fr: 'Dépôt' },
          admin: { width: '50%', readOnly: true },
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      options: submissionStatusOptions,
      label: { de: 'Status', en: 'Status', fr: 'Statut' },
      admin: {
        position: 'sidebar',
        description: {
          en: 'Empty until the Hof hands in a file. Every new file sets it back to "Submitted". The Hof sees the status on its dashboard; only "Revision required" asks it for a new version, together with the feedback.',
          de: 'Leer, bis der Hof eine Datei abgibt. Jede neue Datei setzt den Status auf "Eingereicht" zurück. Der Hof sieht den Status auf seinem Dashboard; nur "Überarbeitung erforderlich" verlangt von ihm eine neue Version, zusammen mit der Rückmeldung.',
          fr: 'Vide tant que le Hof n’a déposé aucun fichier. Chaque nouveau fichier le remet sur « Déposé ». Le Hof voit le statut sur son tableau de bord ; seul « Révision nécessaire » lui demande une nouvelle version, avec le retour.',
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
        components: {
          Cell: '@/features/hof-dashboard/payload-cms/components/safety-risk-cell#SafetyRiskCell',
        },
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
          en: 'Shown to the Hof on its dashboard for as long as it is filled in. Empty it once it no longer applies.',
          de: 'Wird dem Hof auf seinem Dashboard angezeigt, solange es ausgefüllt ist. Leeren, sobald es nicht mehr gilt.',
          fr: 'Affiché au Hof sur son tableau de bord tant qu’il est rempli. À vider dès qu’il ne s’applique plus.',
        },
      },
    },
    {
      name: 'files',
      type: 'join',
      collection: 'hof-files',
      on: 'submission',
      defaultSort: '-createdAt',
      // files come from the Hof's uploads only; the collection refuses create
      admin: {
        allowCreate: false,
        defaultColumns: ['originalFilename', 'kind', 'uploadedBy', 'createdAt'],
      },
      label: { de: 'Dateien', en: 'Files', fr: 'Fichiers' },
    },
  ],
};
