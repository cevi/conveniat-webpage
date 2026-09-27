import { environmentVariables } from '@/config/environment-variables';
import { reviewStatusOptions } from '@/features/hof-dashboard/payload-cms/options';
import type { Field } from 'payload';

/** Only a submission that belongs to a Hof is reviewed on the dashboard. */
const belongsToHof = (data: Record<string, unknown>): boolean =>
  data['hof'] !== undefined && data['hof'] !== null && data['hof'] !== '';

/**
 * What the Ressort answers on a submission a Hof handed in on its dashboard, and who handed
 * it in. The Hof sees the status and the feedback next to its submission.
 */
export const formSubmissionReviewFields: Field[] = [
  {
    name: 'hofReviewStatus',
    type: 'select',
    options: reviewStatusOptions,
    label: { en: 'Ressort status', de: 'Status Ressort', fr: 'Statut du Ressort' },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      position: 'sidebar',
      condition: belongsToHof,
      description: {
        en: 'Empty means handed in and not yet looked at. Only "Revision required" asks the Hof for a new version, together with the feedback.',
        de: 'Leer heisst eingereicht und noch nicht angeschaut. Nur "Überarbeitung erforderlich" verlangt vom Hof eine neue Version, zusammen mit der Rückmeldung.',
        fr: 'Vide signifie déposé et pas encore examiné. Seul « Révision nécessaire » demande au Hof une nouvelle version, avec le retour.',
      },
    },
  },
  {
    name: 'hofFeedback',
    type: 'textarea',
    label: { en: 'Feedback to the Hof', de: 'Rückmeldung an den Hof', fr: 'Retour au Hof' },
    admin: {
      hidden: !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD,
      position: 'sidebar',
      condition: belongsToHof,
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
];
