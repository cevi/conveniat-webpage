import { environmentVariables } from '@/config/environment-variables';
import { getFormBlocks } from '@/features/payload-cms/payload-cms/plugins/form/form-block-names';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import { reservePlaces } from '@/features/visit-day/api/visit-day-places';
import { formatVisitDay } from '@/features/visit-day/format-visit-day';
import {
  listVisitDayHoefe,
  loadVisitDaySettings,
  toDatabaseDate,
} from '@/features/visit-day/visit-day-settings';
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
  hofId: string;
  date: string;
  persons: number;
  capacity: number;
  /** set once the places are taken, so a failure after it gives them back */
  submissionId?: string;
}

const PENDING_VISIT = 'visitDayPendingVisit';

const dayFullMessage: StaticTranslationString = {
  de: 'Für diesen Besuchstag sind nicht mehr genug Plätze frei.',
  en: 'There are not enough places left on this visiting day.',
  fr: 'Il ne reste plus assez de places pour cette journée des visites.',
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

/**
 * Checks a new Besuchstag registration and fills in what the person does not pick: the Hof's
 * name in place of its id, and the day, found through the Hof's Quartier, as an answer of its
 * own so the confirmation email can name it. The places are taken once the submission is saved,
 * by {@link reserveVisitDayPlaces}; refusing a full day here already spares that work.
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
    .at(0) as { name: string; personCountField: string; dayField: string } | undefined;
  if (block === undefined) return data;

  const locale = localeOf(req);
  const answers = Array.isArray(data.submissionData)
    ? (data.submissionData as SubmissionField[]).filter((answer) => answer.field !== block.dayField)
    : [];
  const hofAnswer = answers.find((answer) => answer.field === block.name);
  const hofId = hofAnswer?.value;
  // an unanswered Hof was refused as missing already, or the field is optional
  if (hofAnswer === undefined || typeof hofId !== 'string' || hofId === '') return data;
  if (!environmentVariables.FEATURE_ENABLE_VISIT_DAY) refuse(hofNotOfferedMessage, locale);

  const settings = await loadVisitDaySettings(req.payload);
  const offeredHoefe = await listVisitDayHoefe(req.payload, settings);
  const hof = offeredHoefe.find((offered) => offered.id === hofId);
  const day = settings.days.find((candidate) => candidate.date === hof?.date);
  if (hof === undefined || day === undefined) return refuse(hofNotOfferedMessage, locale);

  const persons = Number(answers.find((answer) => answer.field === block.personCountField)?.value);
  if (!Number.isInteger(persons) || persons < 1) return refuse(invalidPersonCountMessage, locale);

  const taken = await prisma.visitDayVisitor.count({
    where: { visitDate: toDatabaseDate(day.date) },
  });
  if (taken + persons > day.capacity) refuse(dayFullMessage, locale);

  hofAnswer.value = hof.name;
  // in German like the rest of the confirmation email, which is written in the default locale
  answers.push({ field: block.dayField, value: formatVisitDay(day.date, 'de') });
  data.submissionData = answers as NonNullable<FormSubmission['submissionData']>;

  const pending: PendingVisit = {
    hofId: hof.id,
    date: day.date,
    persons,
    capacity: day.capacity,
  };
  req.context[PENDING_VISIT] = pending;
  return data;
};

/**
 * Takes the places of a saved registration, one row per person, or refuses it when the day
 * filled up in the meantime: the submission is removed again and nothing is sent. It runs before
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
  if (result === 'full') {
    req.context[PENDING_VISIT] = undefined;
    await req.payload.delete({
      collection: 'form-submissions',
      id: doc.id,
      overrideAccess: true,
      req,
    });
    req.payload.logger.info(
      `Besuchstag ${pending.date} is full: registration ${doc.id} for ${pending.persons} persons refused.`,
    );
    refuse(dayFullMessage, localeOf(req));
  }
  pending.submissionId = doc.id;
  return doc;
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
  await prisma.visitDayVisitor.deleteMany({ where: { submissionId: pending.submissionId } });
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
