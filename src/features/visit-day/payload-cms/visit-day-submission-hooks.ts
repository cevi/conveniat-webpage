import { environmentVariables } from '@/config/environment-variables';
import { getFormBlocks } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import {
  countTakenPlacesOn,
  EXTERNAL_NUMBER_PREFIX,
  reservePlaces,
} from '@/features/visit-day/api/visit-day-places';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import { EXTERNAL_VISIT, WITH_LUNCH, WITHOUT_LUNCH } from '@/features/visit-day/visit-day-choices';
import type { VisitDay } from '@/features/visit-day/visit-day-settings';
import { listVisitDayHoefe, loadVisitDaySettings } from '@/features/visit-day/visit-day-settings';
import prisma from '@/lib/db/prisma';
import type { Locale, StaticTranslationString } from '@/types/types';
import type {
  AfterErrorHook,
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Config,
  Plugin,
} from 'payload';
import { APIError } from 'payload';

interface SubmissionField {
  field: string;
  value: unknown;
}

/** What the place check needs from the checked submission, kept on the request until it is saved. */
interface PendingVisit {
  /** undefined for a visitor without a Hof */
  hofId: string | undefined;
  hofEventId: string;
  date: string;
  persons: number;
  withLunch: boolean;
  /** the places of this kind the day has */
  capacity: number;
  /** whether the form asks about lunch, so a refusal can name the kind of places */
  asksLunch: boolean;
  /** the answer the registration number is stored under */
  numberField: string;
  /** set once the places are taken, so a failure after it gives them back */
  submissionId?: string;
}

/** The settings of a form's Besuchstag field. */
interface VisitDayBlock {
  name: string;
  personCountField: string;
  dayField: string;
  registrationNumberField: string;
  /** the answer with the lunch choice; a form without one registers everybody with lunch */
  lunchField?: string | null;
}

/** The Hof answer of a visitor without a Hof, in German like the rest of the email. */
const NO_HOF_ANSWER = 'Ohne Bezug zu einem Hof';

const PENDING_VISIT = 'visitDayPendingVisit';

const dayFullMessage: StaticTranslationString = {
  de: 'Für diesen Besuchstag sind nicht mehr genug Plätze frei.',
  en: 'There are not enough places left on this visiting day.',
  fr: 'Il ne reste plus assez de places pour cette journée des visites.',
};

const dayFullWithLunchMessage: StaticTranslationString = {
  de: 'Für diesen Besuchstag sind nicht mehr genug Plätze mit Mittagessen frei.',
  en: 'There are not enough places with lunch left on this visiting day.',
  fr: 'Il ne reste plus assez de places avec repas de midi pour cette journée des visites.',
};

const dayFullWithoutLunchMessage: StaticTranslationString = {
  de: 'Für diesen Besuchstag sind nicht mehr genug Plätze ohne Mittagessen frei.',
  en: 'There are not enough places without lunch left on this visiting day.',
  fr: 'Il ne reste plus assez de places sans repas de midi pour cette journée des visites.',
};

const dayNotOfferedMessage: StaticTranslationString = {
  de: 'Bitte wähle einen der Besuchstage.',
  en: 'Please choose one of the visiting days.',
  fr: 'Choisis l’une des journées des visites.',
};

const invalidLunchMessage: StaticTranslationString = {
  de: 'Bitte wähle, ob ihr im Lager zu Mittag esst.',
  en: 'Please choose whether you have lunch at the camp.',
  fr: 'Indique si vous mangez à midi au camp.',
};

const hofNotOfferedMessage: StaticTranslationString = {
  de: 'Für diesen Hof ist keine Anmeldung zum Besuchstag möglich.',
  en: 'This Hof cannot be registered for the visiting day.',
  fr: 'Ce Hof ne peut pas être inscrit à la journée des visites.',
};

const invalidPersonCountMessage: StaticTranslationString = {
  de: 'Die Anzahl Personen ist ungültig.',
  en: 'The number of persons is not valid.',
  fr: 'Le nombre de personnes n’est pas valable.',
};

const localeOf = (request: { locale?: unknown }): Locale =>
  request.locale === 'fr' || request.locale === 'en' ? request.locale : 'de';

const refuse = (message: StaticTranslationString, locale: Locale): never => {
  throw new APIError(message[locale], 400, undefined, true);
};

/** Names the kind of places only where the form asks about lunch. */
const fullMessageFor = (
  pending: Pick<PendingVisit, 'withLunch'>,
  formAsksLunch: boolean,
): StaticTranslationString => {
  if (!formAsksLunch) return dayFullMessage;
  return pending.withLunch ? dayFullWithLunchMessage : dayFullWithoutLunchMessage;
};

const asksLunch = (block: VisitDayBlock): block is VisitDayBlock & { lunchField: string } =>
  typeof block.lunchField === 'string' && block.lunchField !== '';

/**
 * Checks a new Besuchstag registration and fills in what the person does not pick: the Hof's
 * name in place of its id, and the day, found through the Hof's Quartier, as an answer of its
 * own so the confirmation email can name it. A visitor without a Hof picks the day, which is
 * checked against the days offered and written the same way. Whoever eats lunch takes a place
 * with lunch, the others one without. The places and the registration number are taken
 * once the submission is saved, by {@link reserveVisitDayPlaces}; refusing a full day here
 * already spares that work.
 */
export const resolveVisitDay: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create' || data.form === undefined) return data;
  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  const form = await req.payload.findByID({ collection: 'forms', id: formId, depth: 0, req });
  const block = form.sections
    .flatMap((section) =>
      getFormBlocks(
        section.formSection.fields as unknown[] | null | undefined,
        'visitDaySelection',
      ),
    )
    .at(0) as VisitDayBlock | undefined;
  if (block === undefined) return data;

  const locale = localeOf(req);
  const sent = Array.isArray(data.submissionData) ? (data.submissionData as SubmissionField[]) : [];
  // only a visitor without a Hof picks the day, and only as a `YYYY-MM-DD` checked below
  const pickedDay = sent.find((answer) => answer.field === block.dayField)?.value;
  // the day and the number are the server's to fill in, never the sender's
  const answers = sent.filter(
    (answer) => answer.field !== block.dayField && answer.field !== block.registrationNumberField,
  );
  const hofAnswer = answers.find((answer) => answer.field === block.name);
  const hofId = hofAnswer?.value;
  // an unanswered Hof was refused as missing already, or the field is optional
  if (hofAnswer === undefined || typeof hofId !== 'string' || hofId === '') return data;
  if (!environmentVariables.FEATURE_ENABLE_VISIT_DAY) refuse(hofNotOfferedMessage, locale);

  const settings = await loadVisitDaySettings(req.payload);
  let visit: { hofId: string | undefined; hofName: string; hofEventId: string; day: VisitDay };
  if (hofId === EXTERNAL_VISIT) {
    const day = settings.days.find((candidate) => candidate.date === pickedDay);
    if (day === undefined) return refuse(dayNotOfferedMessage, locale);
    visit = { hofId: undefined, hofName: NO_HOF_ANSWER, hofEventId: EXTERNAL_NUMBER_PREFIX, day };
  } else {
    const offeredHoefe = await listVisitDayHoefe(req.payload, settings);
    const hof = offeredHoefe.find((offered) => offered.id === hofId);
    const day = settings.days.find((candidate) => candidate.date === hof?.date);
    if (hof === undefined || day === undefined) return refuse(hofNotOfferedMessage, locale);
    const hofDocument = await req.payload.findByID({
      collection: 'hoefe',
      id: hof.id,
      depth: 0,
      overrideAccess: true,
      select: { groupId: true, events: true },
      req,
    });
    // every Hof has its Hof-Lager in Cevi.DB; its group is the fallback should one not
    const hofEventId = hofDocument.events?.[0]?.eventId ?? hofDocument.groupId;
    visit = { hofId: hof.id, hofName: hof.name, hofEventId, day };
  }

  const persons = Number(answers.find((answer) => answer.field === block.personCountField)?.value);
  if (!Number.isInteger(persons) || persons < 1) return refuse(invalidPersonCountMessage, locale);

  let withLunch = true;
  if (asksLunch(block)) {
    const lunch = answers.find((answer) => answer.field === block.lunchField)?.value;
    if (lunch !== WITH_LUNCH && lunch !== WITHOUT_LUNCH) return refuse(invalidLunchMessage, locale);
    withLunch = lunch === WITH_LUNCH;
  }
  const capacity = withLunch ? visit.day.capacity : visit.day.capacityWithoutLunch;

  const taken = await countTakenPlacesOn(prisma, visit.day.date, withLunch);
  if (taken + persons > capacity) refuse(fullMessageFor({ withLunch }, asksLunch(block)), locale);

  hofAnswer.value = visit.hofName;
  // in German like the rest of the confirmation email, which is written in the default locale
  answers.push({ field: block.dayField, value: formatVisitDay(visit.day.date, 'de') });
  data.submissionData = answers as NonNullable<FormSubmission['submissionData']>;

  const pending: PendingVisit = {
    hofId: visit.hofId,
    hofEventId: visit.hofEventId,
    date: visit.day.date,
    persons,
    withLunch,
    capacity,
    asksLunch: asksLunch(block),
    numberField: block.registrationNumberField,
  };
  req.context[PENDING_VISIT] = pending;
  return data;
};

/**
 * Takes the places of a saved registration, one row per person, and gives it its number, which
 * is stored as an answer so the confirmation email and the admin panel show it. When the day
 * filled up in the meantime, the submission is removed again and nothing is sent. It runs before
 * the form builder sends its emails, see {@link withVisitDayPlaces}.
 */
export const reserveVisitDayPlaces: CollectionAfterChangeHook<FormSubmission> = async ({
  doc,
  req,
  operation,
}) => {
  const pending = req.context[PENDING_VISIT] as PendingVisit | undefined;
  if (operation !== 'create' || pending === undefined) return doc;

  const result = await reservePlaces(prisma, { ...pending, submissionId: doc.id });
  if (result.status === 'full') {
    req.context[PENDING_VISIT] = undefined;
    await req.payload.delete({
      collection: 'form-submissions',
      id: doc.id,
      overrideAccess: true,
      req,
    });
    req.payload.logger.info(
      `Besuchstag ${pending.date} is full (with lunch: ${pending.withLunch}): registration ${doc.id} for ${pending.persons} persons refused.`,
    );
    return refuse(fullMessageFor(pending, pending.asksLunch), localeOf(req));
  }
  pending.submissionId = doc.id;

  const submissionData = [
    ...(doc.submissionData ?? []),
    { field: pending.numberField, value: result.number },
  ];
  // straight to the database: the number is the server's, and the update hooks of a submission
  // are for editors reviewing it
  await req.payload.db.updateOne({
    collection: 'form-submissions',
    id: doc.id,
    data: { submissionData },
    req,
  });
  return { ...doc, submissionData };
};

/**
 * Gives the places back when the save failed after they were taken, e.g. in a later hook, and
 * the submission was rolled back with it. Where Mongo runs without transactions the submission
 * stays saved, and so do its places.
 */
export const releaseVisitDayPlacesOnError: AfterErrorHook = async ({ req }) => {
  const pending = req.context[PENDING_VISIT] as PendingVisit | undefined;
  if (pending?.submissionId === undefined) return;
  const submission = await req.payload.findByID({
    collection: 'form-submissions',
    id: pending.submissionId,
    depth: 0,
    disableErrors: true,
    overrideAccess: true,
    select: {},
  });
  if (submission !== null) return;
  // its visitors go with it
  await prisma.visitDayRegistration.deleteMany({ where: { submissionId: pending.submissionId } });
  req.payload.logger.warn(
    `Besuchstag places of registration ${pending.submissionId} released after a failed save.`,
  );
};

/**
 * Wraps the form builder so the places are taken before it sends the confirmation email: it puts
 * its own email hook first, and a refused registration must not get one.
 *
 * @param plugin - the configured form builder plugin
 * @returns the plugin, with the Besuchstag hooks on the submissions
 */
export const withVisitDayPlaces =
  (plugin: Plugin): Plugin =>
  async (incomingConfig: Config): Promise<Config> => {
    const config = await plugin(incomingConfig);
    return {
      ...config,
      collections: (config.collections ?? []).map(
        (collection: CollectionConfig): CollectionConfig =>
          collection.slug === 'form-submissions'
            ? {
                ...collection,
                hooks: {
                  ...collection.hooks,
                  afterChange: [reserveVisitDayPlaces, ...(collection.hooks?.afterChange ?? [])],
                  afterError: [
                    ...(collection.hooks?.afterError ?? []),
                    releaseVisitDayPlacesOnError,
                  ],
                },
              }
            : collection,
      ),
    };
  };
