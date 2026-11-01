import {
  countedSubmissions,
  dashboardTitleOf,
  fieldsOf,
  findDashboardForms,
  idOf,
  reviewLogOf,
  sortDashboardForms,
  statusOf,
  toAnswers,
  type HofDashboardFile,
  type HofReviewLogEntry,
  type StoredSubmission,
} from '@/features/hof-dashboard/api/hof-dashboard-data';
import type { HofEntryMode, HofEntryStatus } from '@/features/hof-dashboard/constants';
import { parseMaterialAnswer } from '@/features/payload-cms/components/form/utils/material-list';
import type { HofName } from '@/features/payload-cms/payload-cms/access-rules/can-access-hof-dashboard';
import type { Locale } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload, type Payload } from 'payload';

const logger = createLogger('hof-dashboard:material-orders');

/** Most submissions read over every Hof and material form; far more than the camp will have. */
const MAX_SUBMISSIONS = 20_000;

/** One material a form offers, or one an order still holds after it left the form. */
export interface MaterialOrderItem {
  id: string;
  name: string;
  section: string | undefined;
}

/** One version of a Hof's order, or one entry of a form of entries. */
export interface MaterialOrderVersion {
  id: string;
  submittedAt: string;
  status: HofEntryStatus;
  final: boolean;
  feedback: string;
  /** Ordered quantities by material id; a material not ordered is left out. */
  quantities: Record<string, number>;
  /** What else the Hof answered, such as its remarks to the Ressort. */
  remarks: { label: string; text: string }[];
  reviewLog: HofReviewLogEntry[];
}

/** Where one Hof stands with one material form. */
export interface MaterialOrderOfHof {
  hofId: string;
  hofName: string;
  /** What counts: of a form of versions the newest, of one of entries every entry summed up. */
  quantities: Record<string, number>;
  /** When what counts was last handed in; missing while the Hof has not ordered. */
  orderedAt: string | undefined;
  /** Handed in after the form was last exported, or never exported. */
  changedSinceExport: boolean;
  /** Every submission of the Hof, newest first. */
  versions: MaterialOrderVersion[];
}

/** One material form, with every Hof's order of it. */
export interface MaterialOrderForm {
  id: string;
  title: string;
  mode: HofEntryMode;
  deadline: string | undefined;
  /** The form's materials in its order, then any an order holds that the form no longer has. */
  items: MaterialOrderItem[];
  /** When the form was last exported to Excel. */
  exportedAt: string | undefined;
  /** Every Hof, those without an order included. */
  hoefe: MaterialOrderOfHof[];
}

/** The fields that ask for materials, with the forms that have one. */
const materialListsOf = (form: Parameters<typeof fieldsOf>[0]): ReturnType<typeof fieldsOf> =>
  fieldsOf(form).filter((field) => field.blockType === 'materialList');

/** The quantities of a submission's material lists by material id, and the names it stored. */
const readQuantities = (
  submission: Pick<StoredSubmission, 'submissionData'>,
  listNames: ReadonlySet<string>,
): { quantities: Record<string, number>; names: Map<string, MaterialOrderItem> } => {
  const quantities: Record<string, number> = {};
  const names = new Map<string, MaterialOrderItem>();
  for (const answer of submission.submissionData ?? []) {
    if (!listNames.has(answer.field)) continue;
    for (const line of parseMaterialAnswer(answer.value) ?? []) {
      quantities[line.id] = (quantities[line.id] ?? 0) + line.quantity;
      names.set(line.id, { id: line.id, name: line.name ?? line.id, section: line.section });
    }
  }
  return { quantities, names };
};

/** Adds up quantities by material id. */
const sumQuantities = (all: readonly Record<string, number>[]): Record<string, number> => {
  const total: Record<string, number> = {};
  for (const quantities of all) {
    for (const [id, quantity] of Object.entries(quantities)) {
      total[id] = (total[id] ?? 0) + quantity;
    }
  }
  return total;
};

/** When each material form was last exported, by form id. */
const readExportTimes = async (payload: Payload): Promise<Map<string, string>> => {
  const settings = await payload.findGlobal({
    slug: 'hof-dashboard-settings',
    depth: 0,
    overrideAccess: true,
    select: { materialOrderExports: true },
  });
  return new Map(
    (settings.materialOrderExports ?? []).flatMap((entry) => {
      const formId = idOf(entry.form);
      return formId === undefined ? [] : [[formId, entry.exportedAt] as const];
    }),
  );
};

/**
 * Every material form on the dashboard with the orders of the given Höfe, for the Ressort: what
 * each Hof ordered, every version of it, and whether it changed since the form was last
 * exported. Read in `locale`, the material names included; a material the form no longer offers
 * keeps the name the order stored.
 */
export const getMaterialOrders = async (
  hoefe: readonly HofName[],
  locale: Locale,
): Promise<MaterialOrderForm[]> => {
  const payload = await getPayload({ config });
  const forms = sortDashboardForms(await findDashboardForms(payload, locale), locale).filter(
    (form) => form.hofDashboard?.area === 'material' && materialListsOf(form).length > 0,
  );
  if (forms.length === 0) return [];

  const [exportTimes, submissions] = await Promise.all([
    readExportTimes(payload),
    hoefe.length === 0
      ? { docs: [], totalDocs: 0 }
      : payload.find({
          collection: 'form-submissions',
          where: {
            and: [
              { form: { in: forms.map((form) => form.id) } },
              { hof: { in: hoefe.map((hof) => hof.id) } },
            ],
          },
          sort: '-createdAt',
          depth: 0,
          limit: MAX_SUBMISSIONS,
          overrideAccess: true,
          select: {
            form: true,
            hof: true,
            submissionData: true,
            hofReviewStatus: true,
            hofFeedback: true,
            hofReviewLog: true,
            hofFinal: true,
            approved: true,
            createdAt: true,
          },
        }),
  ]);
  if (submissions.totalDocs > submissions.docs.length) {
    logger.warn('The Höfe have more material orders than the Ressort view reads', {
      'hof_dashboard.submissions': submissions.totalDocs,
    });
  }
  const stored = submissions.docs as (StoredSubmission & { hof: string | { id: string } })[];

  return forms.map((form): MaterialOrderForm => {
    const fields = fieldsOf(form);
    const lists = materialListsOf(form);
    const listNames = new Set(lists.map((list) => list.name));
    const items = new Map<string, MaterialOrderItem>();
    for (const list of lists) {
      for (const item of list.items ?? []) {
        if (typeof item.id !== 'string' || items.has(item.id)) continue;
        items.set(item.id, {
          id: item.id,
          name: item.name ?? item.id,
          section: item.section === null || item.section === '' ? undefined : item.section,
        });
      }
    }
    const exportedAt = exportTimes.get(form.id);
    const mode: HofEntryMode = form.hofDashboard?.entries === 'entries' ? 'entries' : 'versions';

    const ofForm = stored.filter((submission) => idOf(submission.form) === form.id);
    const orders = hoefe.map((hof): MaterialOrderOfHof => {
      const own = ofForm.filter((submission) => idOf(submission.hof) === hof.id);
      const versions = own.map((submission): MaterialOrderVersion => {
        const { quantities, names } = readQuantities(submission, listNames);
        // a material removed from the form since: listed after the others by its stored name
        for (const [id, item] of names) if (!items.has(id)) items.set(id, item);
        const values = new Map(
          (submission.submissionData ?? []).map((answer) => [answer.field, answer.value]),
        );
        return {
          id: submission.id,
          submittedAt: submission.createdAt,
          status: statusOf(submission),
          final: submission.hofFinal === true,
          feedback: submission.hofFeedback ?? '',
          quantities,
          remarks: toAnswers(fields, values, new Map<string, HofDashboardFile>(), locale).flatMap(
            (answer) =>
              answer.kind === 'text' ? [{ label: answer.label, text: answer.text }] : [],
          ),
          reviewLog: reviewLogOf(submission),
        };
      });
      const counted = new Set(countedSubmissions(form, own).map((submission) => submission.id));
      const countedVersions = versions.filter((version) => counted.has(version.id));
      const orderedAt = countedVersions[0]?.submittedAt;
      return {
        hofId: hof.id,
        hofName: hof.name,
        quantities: sumQuantities(countedVersions.map((version) => version.quantities)),
        orderedAt,
        changedSinceExport:
          orderedAt !== undefined && (exportedAt === undefined || orderedAt > exportedAt),
        versions,
      };
    });

    return {
      id: form.id,
      title: dashboardTitleOf(form),
      mode,
      deadline: form.hofDashboard?.deadline ?? undefined,
      items: [...items.values()],
      exportedAt,
      hoefe: orders,
    };
  });
};

/**
 * Records that the given forms were exported now, so the Ressort sees which orders changed
 * after it. Kept on the dashboard's settings, so every reviewer sees the same time. A failure
 * is logged and does not stop the download it belongs to.
 */
export const recordMaterialOrderExport = async (
  formIds: readonly string[],
  at: Date,
): Promise<void> => {
  try {
    const payload = await getPayload({ config });
    const settings = await payload.findGlobal({
      slug: 'hof-dashboard-settings',
      depth: 0,
      overrideAccess: true,
      select: { materialOrderExports: true },
    });
    const kept = (settings.materialOrderExports ?? []).filter(
      (entry) => !formIds.includes(idOf(entry.form) ?? ''),
    );
    await payload.updateGlobal({
      slug: 'hof-dashboard-settings',
      data: {
        materialOrderExports: [
          ...kept.map((entry) => ({ form: idOf(entry.form) ?? '', exportedAt: entry.exportedAt })),
          ...formIds.map((form) => ({ form, exportedAt: at.toISOString() })),
        ],
      },
      depth: 0,
      overrideAccess: true,
    });
  } catch (error) {
    logger.warn('Could not record the export of the material orders', {
      'hof_dashboard.forms': formIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
