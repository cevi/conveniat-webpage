import {
  HOF_FILES_MAX_COUNT,
  HOF_SUBMISSION_TYPE_AREA,
  HOF_SUBMISSION_TYPES,
  type HofDashboardArea,
  type HofFileKind,
  type HofOrderType,
  type HofSubmissionStatus,
  type HofSubmissionType,
} from '@/features/hof-dashboard/constants';
import { toFiles } from '@/features/hof-dashboard/utils/file-versions';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Hof, HofDashboardSetting } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';

const logger = createLogger('hof-dashboard:data');

export interface HofContact {
  name: string;
  email: string;
  phone: string;
}

export interface HofDashboardDeadline {
  id: string;
  date: string;
  title: string;
  area: HofDashboardArea;
}

export interface HofDashboardFile {
  id: string;
  filename: string;
  url: string | undefined;
  kind: HofFileKind;
  uploadedAt: string;
  /** 1 for the first plan of a submission, counted per kind. */
  version: number;
}

export interface HofDashboardSubmission {
  type: HofSubmissionType;
  area: HofDashboardArea;
  status: HofSubmissionStatus | undefined;
  elevatedSafetyRisk: 'yes' | 'no' | undefined;
  feedback: string | undefined;
  files: HofDashboardFile[];
  deadlines: string[];
}

export interface HofDashboardOrder {
  type: HofOrderType;
  deadline: string | undefined;
  items: { id: string; name: string; section: string | undefined; quantity: number }[];
  /** Lines the Hof ordered that are no longer on the list, kept as they were ordered. */
  retiredItems: { id: string; name: string; quantity: number }[];
  powerConnection: boolean;
  /**
   * When the order was last stored, by the Hof or a reviewer; the form takes over what is
   * stored when this moves.
   */
  savedAt: string | undefined;
}

export interface HofDashboardDocument {
  id: string;
  title: string;
  url: string;
  filesize: number | undefined;
  area: HofDashboardArea | undefined;
}

interface HofDashboardStadtlebenEntry {
  id: string;
  title: string | undefined;
  submittedAt: string;
  approved: boolean;
}

export interface HofDashboardData {
  hof: { id: string; name: string };
  contacts: { avp: HofContact; coach: HofContact; buildingManager: HofContact };
  deadlines: HofDashboardDeadline[];
  submissions: HofDashboardSubmission[];
  orders: Record<HofOrderType, HofDashboardOrder>;
  stadtleben: {
    deadline: string | undefined;
    formUrl: string | undefined;
    entries: HofDashboardStadtlebenEntry[];
  };
  documents: HofDashboardDocument[];
  safetyRiskCriteria: string[];
}

const toContact = (
  contact: { name?: string | null; email?: string | null; phone?: string | null } | undefined,
): HofContact => ({
  name: contact?.name ?? '',
  email: contact?.email ?? '',
  phone: contact?.phone ?? '',
});

const idOf = (reference: string | { id: string } | null | undefined): string | undefined =>
  typeof reference === 'object' && reference !== null ? reference.id : (reference ?? undefined);

/**
 * The settings every dashboard shares, in the reader's language. The texts are only required
 * in German, and the site does not fall back on its own, so an untranslated text reads in
 * German instead of blank. The Stadtleben form comes trimmed to its title, since only its
 * id is used.
 */
export const getHofDashboardSettings = async (
  payload: Payload,
  locale: Locale,
): Promise<HofDashboardSetting> =>
  await payload.findGlobal({
    slug: 'hof-dashboard-settings',
    locale,
    fallbackLocale: LOCALE.DE,
    depth: 1,
    populate: {
      forms: { title: true },
      documents: { title: true, filename: true, url: true, filesize: true },
    },
    overrideAccess: true,
  });

const toOrder = (
  type: HofOrderType,
  list: HofDashboardSetting['infrastructureOrder'],
  stored:
    | {
        items?: { itemId: string; name: string; quantity: number }[] | null;
        powerConnection?: boolean | null;
        updatedAt: string;
      }
    | undefined,
): HofDashboardOrder => {
  const quantities = new Map((stored?.items ?? []).map((line) => [line.itemId, line]));
  const items = (list?.items ?? []).flatMap((item) =>
    typeof item.id === 'string'
      ? [
          {
            id: item.id,
            name: item.name,
            section: item.section ?? undefined,
            quantity: quantities.get(item.id)?.quantity ?? 0,
          },
        ]
      : [],
  );
  const listed = new Set(items.map((item) => item.id));
  const retiredItems = (stored?.items ?? [])
    .filter((line) => !listed.has(line.itemId) && line.quantity > 0)
    .map((line) => ({ id: line.itemId, name: line.name, quantity: line.quantity }));
  return {
    type,
    deadline: list?.deadline ?? undefined,
    items,
    retiredItems,
    powerConnection: stored?.powerConnection === true,
    savedAt: stored?.updatedAt,
  };
};

/** Names a Stadtleben registration by one of its answers, as the settings say. */
const answerOf = (
  submissionData: unknown,
  fieldName: string | null | undefined,
): string | undefined => {
  if (!Array.isArray(submissionData) || typeof fieldName !== 'string' || fieldName === '') {
    return undefined;
  }
  const answer = (submissionData as { field?: unknown; value?: unknown }[]).find(
    (entry) => entry.field === fieldName,
  );
  return typeof answer?.value === 'string' && answer.value !== '' ? answer.value : undefined;
};

/**
 * Everything one Hof's dashboard shows. The caller has checked that the user may open the Hof;
 * everything here reads with `overrideAccess`, narrowed to that Hof.
 */
export const getHofDashboardData = async (
  hofId: string,
  locale: Locale,
): Promise<HofDashboardData> => {
  const payload = await getPayload({ config });

  const [hof, settings, storedSubmissions, storedFiles, storedOrders] = await Promise.all([
    payload.findByID({
      collection: 'hoefe',
      id: hofId,
      depth: 0,
      overrideAccess: true,
      select: { name: true, dashboardContacts: true },
    }) as Promise<Pick<Hof, 'id' | 'name' | 'dashboardContacts'>>,
    getHofDashboardSettings(payload, locale),
    payload.find({
      collection: 'hof-submissions',
      where: { hof: { equals: hofId } },
      depth: 0,
      limit: HOF_SUBMISSION_TYPES.length,
      pagination: false,
      overrideAccess: true,
      select: { submissionType: true, status: true, elevatedSafetyRisk: true, feedback: true },
    }),
    payload.find({
      collection: 'hof-files',
      where: { hof: { equals: hofId } },
      depth: 0,
      // oldest first, so a cut at the limit keeps the version numbers of what it shows
      sort: 'createdAt',
      limit: HOF_FILES_MAX_COUNT,
      overrideAccess: true,
      select: {
        submission: true,
        kind: true,
        originalFilename: true,
        filename: true,
        url: true,
        createdAt: true,
      },
    }),
    payload.find({
      collection: 'hof-material-orders',
      where: { hof: { equals: hofId } },
      depth: 0,
      limit: 2,
      pagination: false,
      overrideAccess: true,
      select: { orderType: true, items: true, powerConnection: true, updatedAt: true },
    }),
  ]);

  if (storedFiles.totalDocs > storedFiles.docs.length) {
    logger.warn('A Hof has more files than its dashboard shows', {
      'hof_dashboard.hof_id': hofId,
      'hof_dashboard.files': storedFiles.totalDocs,
    });
  }

  const storedDeadlines = (settings.deadlines ?? []).toSorted((a, b) =>
    a.date.localeCompare(b.date),
  );
  const deadlines: HofDashboardDeadline[] = storedDeadlines.map((deadline, index) => ({
    id: deadline.id ?? String(index),
    date: deadline.date,
    title: deadline.title,
    area: deadline.area,
  }));

  const submissions: HofDashboardSubmission[] = HOF_SUBMISSION_TYPES.map((type) => {
    const stored = storedSubmissions.docs.find((candidate) => candidate.submissionType === type);
    const files =
      stored === undefined
        ? []
        : storedFiles.docs.filter((file) => idOf(file.submission) === stored.id);
    return {
      type,
      area: HOF_SUBMISSION_TYPE_AREA[type],
      status: stored?.status ?? undefined,
      elevatedSafetyRisk: stored?.elevatedSafetyRisk ?? undefined,
      feedback: stored?.feedback ?? undefined,
      files: toFiles(files),
      deadlines: storedDeadlines
        .filter((deadline) => deadline.submissionTypes?.includes(type) === true)
        .map((deadline) => deadline.date),
    };
  });

  const orderOf = (type: HofOrderType): (typeof storedOrders.docs)[number] | undefined =>
    storedOrders.docs.find((order) => order.orderType === type);

  const stadtlebenFormId = idOf(settings.stadtlebenForm);
  const stadtlebenSubmissions =
    stadtlebenFormId === undefined
      ? []
      : await payload
          .find({
            collection: 'form-submissions',
            where: {
              and: [{ form: { equals: stadtlebenFormId } }, { hof: { equals: hofId } }],
            },
            depth: 0,
            limit: 100,
            pagination: false,
            overrideAccess: true,
            sort: '-createdAt',
            select: { submissionData: true, approved: true, createdAt: true },
          })
          .then((result) => result.docs);
  const stadtlebenEntries = stadtlebenSubmissions.map((entry) => ({
    id: entry.id,
    title: answerOf(entry.submissionData, settings.stadtlebenTitleFieldName),
    submittedAt: entry.createdAt,
    approved: entry.approved === true,
  }));

  const documents: HofDashboardDocument[] = (settings.documents ?? []).flatMap((entry) => {
    const document = entry.document;
    // a document without a file behind it has nothing to download
    if (typeof document !== 'object' || typeof document.url !== 'string') return [];
    return [
      {
        id: document.id,
        title: document.title ?? document.filename ?? document.id,
        url: document.url,
        filesize: document.filesize ?? undefined,
        area: entry.area ?? undefined,
      },
    ];
  });

  return {
    hof: { id: hof.id, name: hof.name },
    contacts: {
      avp: toContact(hof.dashboardContacts?.avp),
      coach: toContact(hof.dashboardContacts?.coach),
      buildingManager: toContact(hof.dashboardContacts?.buildingManager),
    },
    deadlines,
    submissions,
    orders: {
      infrastructure: toOrder(
        'infrastructure',
        settings.infrastructureOrder,
        orderOf('infrastructure'),
      ),
      stadtleben: toOrder('stadtleben', settings.stadtlebenOrder, orderOf('stadtleben')),
    },
    stadtleben: {
      deadline: settings.stadtlebenDeadline ?? undefined,
      formUrl: settings.stadtlebenFormUrl ?? undefined,
      entries: stadtlebenEntries,
    },
    documents,
    safetyRiskCriteria: (settings.safetyRiskCriteria ?? []).map((entry) => entry.criterion),
  };
};
