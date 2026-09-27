import { environmentVariables } from '@/config/environment-variables';
import {
  reviewChoiceOptions,
  reviewStatusOptions,
} from '@/features/hof-dashboard/payload-cms/options';
import { canReviewHofDashboard } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { Field } from 'payload';

/** Only a submission that belongs to a Hof is reviewed on the dashboard. */
const belongsToHof = (data: Record<string, unknown>): boolean =>
  data['hof'] !== undefined && data['hof'] !== null && data['hof'] !== '';

/**
 * What the Ressort answers on a submission a Hof handed in on its dashboard, and who handed
 * it in. The Hof sees the status and the feedback next to its submission, with who wrote it;
 * the reviewers also see every change of either, in `hofReviewLog`.
 */
export const formSubmissionReviewFields: Field[] = [
  {
    name: 'hofReviewStatus',
    type: 'select',
    options: reviewStatusOptions,
    label: { en: 'Ressort status', de: 'Status Ressort', fr: 'Statut du Ressort' },
    // anyone may hand a form in, so a status sent along with it would accept itself
    access: { create: canReviewHofDashboard, update: canReviewHofDashboard },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      position: 'sidebar',
      condition: belongsToHof,
      description: {
        en: 'Empty means handed in and not yet looked at. Only "Revision required" asks the Hof for a new version, together with the feedback. To accept a submission, tick "Approved".',
        de: 'Leer heisst eingereicht und noch nicht angeschaut. Nur "Überarbeitung erforderlich" verlangt vom Hof eine neue Version, zusammen mit der Rückmeldung. Zum Freigeben "Freigegeben" ankreuzen.',
        fr: 'Vide signifie déposé et pas encore examiné. Seul « Révision nécessaire » demande au Hof une nouvelle version, avec le retour. Pour valider, cocher « Approuvé ».',
      },
    },
  },
  {
    name: 'hofFeedback',
    type: 'textarea',
    label: { en: 'Feedback to the Hof', de: 'Rückmeldung an den Hof', fr: 'Retour au Hof' },
    access: { create: canReviewHofDashboard, update: canReviewHofDashboard },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      position: 'sidebar',
      condition: belongsToHof,
    },
  },
  {
    name: 'hofFinal',
    type: 'checkbox',
    label: {
      en: 'Final: no further versions',
      de: 'Definitiv: keine weiteren Versionen',
      fr: 'Définitif : plus de nouvelles versions',
    },
    access: { create: canReviewHofDashboard, update: canReviewHofDashboard },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      position: 'sidebar',
      condition: belongsToHof,
      description: {
        en: 'For a form of versions, e.g. a material order: the Hof can no longer hand in a new one. Changes then go through the Ressort.',
        de: 'Bei einem Formular mit Versionen, z.B. einer Materialbestellung: Der Hof kann keine neue mehr abgeben. Änderungen laufen dann über das Ressort.',
        fr: 'Pour un formulaire à versions, p. ex. une commande de matériel : le Hof ne peut plus en déposer de nouvelle. Les modifications passent alors par le Ressort.',
      },
    },
  },
  {
    name: 'submittedBy',
    type: 'relationship',
    relationTo: 'users',
    label: { en: 'Handed in by', de: 'Abgegeben von', fr: 'Déposé par' },
    // set from the session when a Hof hands a form in, never by the request
    access: { create: () => false, update: () => false },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      position: 'sidebar',
      readOnly: true,
      condition: belongsToHof,
    },
  },
  {
    name: 'hofReviewLog',
    type: 'array',
    label: { en: 'Review history', de: 'Verlauf der Rückmeldungen', fr: 'Historique des retours' },
    labels: {
      singular: { en: 'Change', de: 'Änderung', fr: 'Modification' },
      plural: { en: 'Changes', de: 'Änderungen', fr: 'Modifications' },
    },
    // written by recordHofReview on every change of status or feedback, and by nothing else;
    // for the reviewers only, the Hof sees who wrote the current feedback
    access: { read: canReviewHofDashboard, create: () => false, update: () => false },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      readOnly: true,
      condition: belongsToHof,
      initCollapsed: true,
      description: {
        en: 'Who changed the status or the feedback, and when. Written on every save.',
        de: 'Wer Status oder Rückmeldung wann geändert hat. Wird bei jedem Speichern ergänzt.',
        fr: 'Qui a modifié le statut ou le retour, et quand. Complété à chaque enregistrement.',
      },
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'changedAt',
            type: 'date',
            required: true,
            label: { en: 'When', de: 'Wann', fr: 'Quand' },
            admin: {
              width: '30%',
              date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd.MM.yyyy HH:mm' },
            },
          },
          {
            name: 'reviewerName',
            type: 'text',
            label: { en: 'Who', de: 'Wer', fr: 'Qui' },
            admin: { width: '40%' },
          },
          {
            name: 'status',
            type: 'select',
            options: reviewChoiceOptions,
            label: { en: 'Status', de: 'Status', fr: 'Statut' },
            admin: { width: '30%' },
          },
        ],
      },
      {
        name: 'final',
        type: 'checkbox',
        label: { en: 'Final', de: 'Definitiv', fr: 'Définitif' },
      },
      {
        name: 'feedback',
        type: 'textarea',
        label: { en: 'Feedback', de: 'Rückmeldung', fr: 'Retour' },
      },
      {
        // kept next to the name, which stays as it was when the change was made
        name: 'reviewer',
        type: 'relationship',
        relationTo: 'users',
        label: { en: 'User', de: 'Benutzer', fr: 'Utilisateur' },
      },
    ],
  },
];
