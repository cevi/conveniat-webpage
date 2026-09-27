import { environmentVariables } from '@/config/environment-variables';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import {
  canReviewHofDashboard,
  mayOpenHof,
} from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { Form, FormSubmission } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import type { CollectionBeforeChangeHook } from 'payload';
import { APIError } from 'payload';

const texts = {
  loginRequired: {
    en: 'Sign in with Cevi.DB to hand this in for your Hof.',
    de: 'Melde dich mit Cevi.DB an, um das für deinen Hof abzugeben.',
    fr: 'Connecte-toi avec Cevi.DB pour déposer ceci pour ton Hof.',
  },
  notYourHof: {
    en: 'Only the address administrators of this Hof can hand this in.',
    de: 'Nur die Adressverwaltung dieses Hofs kann das abgeben.',
    fr: 'Seule la gestion des adresses de ce Hof peut déposer ceci.',
  },
  hofMissing: {
    en: 'Choose the Hof this belongs to.',
    de: 'Wähle den Hof, zu dem das gehört.',
    fr: 'Choisis le Hof auquel cela appartient.',
  },
  closed: {
    en: 'This form closed on its due date.',
    de: 'Dieses Formular ist seit dem Abgabetermin geschlossen.',
    fr: 'Ce formulaire est fermé depuis son échéance.',
  },
  final: {
    en: 'The Ressort marked this as final. Contact them for changes.',
    de: 'Das Ressort hat dies als definitiv markiert. Änderungen laufen über das Ressort.',
    fr: 'Le Ressort l’a marqué comme définitif. Adresse-toi à lui pour toute modification.',
  },
} satisfies Record<string, StaticTranslationString>;

/**
 * Guards a submission to a form on the Hof dashboard, after `linkHofSubmission` set its Hof:
 * it needs a signed-in user who may hand it in for that Hof, and a form still open. Records
 * who handed it in.
 *
 * Anyone may create a form submission over REST, so the Hof picked in the form is checked
 * here, not trusted: otherwise anyone could hand in a plan for any Hof.
 */
export const checkHofDashboardSubmission: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create' || !environmentVariables.FEATURE_ENABLE_HOF_DASHBOARD) return data;
  if (data.form === undefined) return data;

  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  const form = (await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 0,
    select: { hofDashboard: true },
    req,
  })) as Pick<Form, 'hofDashboard'>;
  const settings = form.hofDashboard;
  if (settings?.area === undefined || settings.area === null) return data;

  const locale = (req.locale as Locale | undefined) ?? 'de';
  const user = req.user;
  if (user === null) {
    throw new APIError(texts.loginRequired[locale], 401, undefined, true);
  }
  const hofId = typeof data.hof === 'object' && data.hof !== null ? data.hof.id : data.hof;
  if (typeof hofId !== 'string') throw new APIError(texts.hofMissing[locale], 400, undefined, true);

  const isReviewer = canReviewHofDashboard({ req });
  if (settings.onlyHofAdministrators !== false && !(await mayOpenHof(req, hofId))) {
    req.payload.logger.info({
      msg: 'Refused a Hof dashboard submission for a Hof the user does not administer',
      formId,
      hofId,
    });
    throw new APIError(texts.notYourHof[locale], 403, undefined, true);
  }

  if (
    settings.closesAtDeadline === true &&
    typeof settings.deadline === 'string' &&
    daysUntil(settings.deadline, new Date()) < 0 &&
    !isReviewer
  ) {
    throw new APIError(texts.closed[locale], 400, undefined, true);
  }

  // a version marked final is the last one the Hof hands in
  if (settings.entries !== 'entries' && !isReviewer) {
    const { docs } = await req.payload.find({
      collection: 'form-submissions',
      where: { and: [{ form: { equals: formId } }, { hof: { equals: hofId } }] },
      sort: '-createdAt',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      select: { hofFinal: true },
      req,
    });
    if (docs[0]?.hofFinal === true) {
      throw new APIError(texts.final[locale], 400, undefined, true);
    }
  }

  data.submittedBy = user.id;
  return data;
};
