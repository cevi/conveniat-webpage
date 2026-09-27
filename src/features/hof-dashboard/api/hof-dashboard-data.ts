import {
  type HofDashboardArea,
  type HofEntryMode,
  type HofEntryStatus,
  type HofReviewStatus,
} from '@/features/hof-dashboard/constants';
import { daysUntil } from '@/features/hof-dashboard/utils/submission-progress';
import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import {
  parseMaterialAnswer,
  serializeMaterialAnswer,
} from '@/features/payload-cms/components/form/utils/material-list';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { Form, Hof } from '@/features/payload-cms/payload-types';
import type { Locale, StaticTranslationString } from '@/types/types';
import { createLogger } from '@/utils/server-logger';
import config from '@payload-config';
import { getPayload } from 'payload';

const logger = createLogger('hof-dashboard:data');

/** Most submissions one Hof's dashboard lists over all its forms. */
const MAX_SUBMISSIONS = 500;

/** Most forms linked to the dashboard; far more than it will ever have. */
const MAX_FORMS = 100;

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

/** A file handed in with a submission. */
export interface HofDashboardFile {
  id: string;
  name: string;
  url: string;
  size: number | undefined;
  mimeType: string | undefined;
}

/** One answer of a submission, as the dashboard shows it back to the Hof. */
export type HofDashboardAnswer =
  | { field: string; label: string; kind: 'text'; text: string }
  | { field: string; label: string; kind: 'files'; files: HofDashboardFile[] }
  | {
      field: string;
      label: string;
      kind: 'materials';
      materials: { id: string; name: string; section: string | undefined; quantity: number }[];
    };

/** One submission of a form by the Hof. */
export interface HofDashboardEntry {
  id: string;
  submittedAt: string;
  /** The answer that names it, for forms whose submissions are separate entries. */
  title: string | undefined;
  status: HofEntryStatus;
  feedback: string | undefined;
  answers: HofDashboardAnswer[];
  /** Whether the Hof may still take it back: handed in, and not yet taken up by the Ressort. */
  withdrawable: boolean;
  /** The Ressort's own status, without the website approval that also reads as accepted. */
  reviewStatus: HofReviewStatus | undefined;
  /** Who wrote the current feedback, and when. */
  feedbackBy: { name: string; at: string } | undefined;
  /** Every change of status or feedback, newest first; for the reviewers only, else empty. */
  reviewLog: HofReviewLogEntry[];
}

/** One change of a submission's review: when, by whom, and what it was set to. */
export interface HofReviewLogEntry {
  at: string;
  by: string;
  status: HofEntryStatus;
  feedback: string;
}

/** A form linked to the dashboard, with the Hof's submissions of it, newest first. */
export interface HofDashboardForm {
  id: string;
  area: HofDashboardArea;
  title: string;
  description: string | undefined;
  deadline: string | undefined;
  /** Closed at its due date. */
  closed: boolean;
  mode: HofEntryMode;
  /** The field that asks for the Hof, answered by the dashboard. */
  hofField: string;
  /** Answers a new submission starts from: the material lists of the newest one. */
  initialValues: Record<string, string>;
  /** The form as its block renders it. */
  form: ExtendedFormType;
  entries: HofDashboardEntry[];
}

export interface HofDashboardDocument {
  id: string;
  title: string;
  url: string;
  filesize: number | undefined;
  area: HofDashboardArea | undefined;
}

export interface HofDashboardData {
  hof: { id: string; name: string };
  contacts: { avp: HofContact; coach: HofContact; buildingManager: HofContact };
  deadlines: HofDashboardDeadline[];
  forms: HofDashboardForm[];
  documents: HofDashboardDocument[];
  /** Whether the reader reviews: answers submissions instead of handing them in. */
  isReviewer: boolean;
}

const toContact = (
  contact: { name?: string | null; email?: string | null; phone?: string | null } | undefined,
): HofContact => ({
  name: contact?.name ?? '',
  email: contact?.email ?? '',
  phone: contact?.phone ?? '',
});

/** The id of a relationship, whether Payload returned it populated or not. */
export const idOf = (reference: string | { id: string } | null | undefined): string | undefined =>
  typeof reference === 'object' && reference !== null ? reference.id : (reference ?? undefined);

/** Whether a form is published in the language it was read in. */
const isPublished = (form: { _localized_status?: unknown }): boolean =>
  (form._localized_status as { published?: boolean } | undefined)?.published === true;

/** A field of a form, as far as showing its answer needs it. */
interface FormField {
  blockType: string;
  name: string;
  label: string;
  options?: { value: string; label: string }[];
  /** The lines of a material list. */
  items?: { id?: string | null }[];
}

/** Every named field of a form in the order it asks them, conditioned ones included. */
const fieldsOf = (form: Pick<Form, 'sections'>): FormField[] => {
  const collect = (fields: unknown[] | null | undefined): FormField[] =>
    (fields ?? []).flatMap((field): FormField[] => {
      if (field === null || typeof field !== 'object') return [];
      const block = field as Partial<FormField> & { fields?: unknown[] | null };
      if (block.blockType === 'conditionedBlock') return collect(block.fields);
      if (typeof block.blockType !== 'string' || typeof block.name !== 'string') return [];
      return [
        {
          blockType: block.blockType,
          name: block.name,
          label: typeof block.label === 'string' ? block.label : block.name,
          ...(Array.isArray(block.options) ? { options: block.options } : {}),
          ...(Array.isArray(block.items) ? { items: block.items } : {}),
        },
      ];
    });
  return form.sections.flatMap((section) =>
    collect(section.formSection.fields as unknown[] | null | undefined),
  );
};

const YES: StaticTranslationString = { de: 'Ja', en: 'Yes', fr: 'Oui' };
const NO: StaticTranslationString = { de: 'Nein', en: 'No', fr: 'Non' };

/** Fields the dashboard answers itself or that answer nothing worth showing back. */
const UNSHOWN_FIELDS = new Set(['hofSelection', 'message', 'ceviDbLogin']);

/** The answers of a submission in the order its form asks them, the empty ones left out. */
const toAnswers = (
  fields: FormField[],
  values: Map<string, string>,
  files: ReadonlyMap<string, HofDashboardFile>,
  locale: Locale,
): HofDashboardAnswer[] =>
  fields.flatMap((field): HofDashboardAnswer[] => {
    const value = values.get(field.name);
    if (UNSHOWN_FIELDS.has(field.blockType) || value === undefined || value === '') return [];
    const base = { field: field.name, label: field.label };
    switch (field.blockType) {
      case 'fileUpload': {
        const handedIn = value
          .split(',')
          .map((id) => files.get(id.trim()))
          .filter((file) => file !== undefined);
        return handedIn.length === 0 ? [] : [{ ...base, kind: 'files', files: handedIn }];
      }
      case 'materialList': {
        const lines = parseMaterialAnswer(value) ?? [];
        return lines.length === 0
          ? []
          : [
              {
                ...base,
                kind: 'materials',
                materials: lines.map((line) => ({
                  id: line.id,
                  name: line.name ?? line.id,
                  section: line.section,
                  quantity: line.quantity,
                })),
              },
            ];
      }
      case 'checkbox': {
        return [{ ...base, kind: 'text', text: (value === 'true' ? YES : NO)[locale] }];
      }
      case 'select': {
        const labels = value
          .split(', ')
          .map(
            (chosen) => field.options?.find((option) => option.value === chosen)?.label ?? chosen,
          );
        return [{ ...base, kind: 'text', text: labels.join(', ') }];
      }
      default: {
        return [{ ...base, kind: 'text', text: value }];
      }
    }
  });

interface StoredSubmission {
  id: string;
  form: string | { id: string };
  submissionData?: { field: string; value: string }[] | null;
  hofReviewStatus?: 'inReview' | 'revisionRequired' | 'accepted' | null;
  hofFeedback?: string | null;
  hofReviewLog?:
    | {
        changedAt: string;
        reviewerName?: string | null;
        status?: HofReviewStatus | null;
        feedback?: string | null;
      }[]
    | null;
  approved?: boolean | null;
  createdAt: string;
}

/**
 * Who wrote the feedback a submission shows now, and when: the change that set it, which is the
 * first of the latest changes that all kept it.
 */
const feedbackAuthor = (submission: StoredSubmission): { name: string; at: string } | undefined => {
  const feedback = submission.hofFeedback ?? '';
  const log = submission.hofReviewLog ?? [];
  if (feedback === '' || log.length === 0) return undefined;
  let setBy: (typeof log)[number] | undefined;
  for (const change of log.toReversed()) {
    if ((change.feedback ?? '') !== feedback) break;
    setBy = change;
  }
  return setBy === undefined || (setBy.reviewerName ?? '') === ''
    ? undefined
    : { name: setBy.reviewerName ?? '', at: setBy.changedAt };
};

/** Where a submission stands: approved for the website counts as accepted. */
const statusOf = (submission: StoredSubmission): HofEntryStatus =>
  submission.approved === true ? 'accepted' : (submission.hofReviewStatus ?? 'submitted');

/** The form, trimmed to what its block renders, as the page would hand it over. */
const toRenderedForm = (form: Form): ExtendedFormType =>
  ({
    id: form.id,
    title: form.title,
    autocomplete: form.autocomplete,
    fileUploadLimitMB: form.fileUploadLimitMB,
    sections: form.sections,
    submitButtonLabel: form.submitButtonLabel,
    confirmationType: form.confirmationType,
    confirmationMessage: form.confirmationMessage,
    redirect: form.redirect,
    _localized_status: { published: true },
  }) as unknown as ExtendedFormType;

/**
 * Everything one Hof's dashboard shows: the forms linked to it with the Hof's submissions of
 * them, the camp's deadlines, the Hof's contacts and the documents. The caller has checked
 * that the user may open the Hof; everything here reads with `overrideAccess`, narrowed to it.
 */
export const getHofDashboardData = async (
  hofId: string,
  locale: Locale,
  isReviewer: boolean,
): Promise<HofDashboardData> => {
  const payload = await getPayload({ config });

  const [hof, settings, linkedForms, publishedInGerman] = await Promise.all([
    payload.findByID({
      collection: 'hoefe',
      id: hofId,
      depth: 0,
      overrideAccess: true,
      select: { name: true, dashboardContacts: true },
    }) as Promise<Pick<Hof, 'id' | 'name' | 'dashboardContacts'>>,
    payload.findGlobal({
      slug: 'hof-dashboard-settings',
      locale,
      fallbackLocale: LOCALE.DE,
      depth: 1,
      populate: { documents: { title: true, filename: true, url: true, filesize: true } },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'forms',
      where: { 'hofDashboard.area': { exists: true } },
      locale,
      fallbackLocale: LOCALE.DE,
      depth: 0,
      limit: MAX_FORMS,
      pagination: false,
      overrideAccess: true,
    }),
    // German is the fallback: a form not yet translated reads in German, as the settings do,
    // rather than vanishing with the Hof's submissions of it
    payload.find({
      collection: 'forms',
      where: { 'hofDashboard.area': { exists: true } },
      locale: LOCALE.DE,
      depth: 0,
      limit: MAX_FORMS,
      pagination: false,
      overrideAccess: true,
      select: { _localized_status: true },
    }),
  ]);

  const germanIds = new Set(
    publishedInGerman.docs.filter((form) => isPublished(form)).map((form) => form.id),
  );
  const forms = linkedForms.docs.filter(
    (form) =>
      typeof form.hofDashboard?.area === 'string' && (isPublished(form) || germanIds.has(form.id)),
  );

  const submissions = (
    forms.length === 0
      ? { docs: [], totalDocs: 0 }
      : await payload.find({
          collection: 'form-submissions',
          where: {
            and: [{ hof: { equals: hofId } }, { form: { in: forms.map((form) => form.id) } }],
          },
          depth: 0,
          sort: '-createdAt',
          limit: MAX_SUBMISSIONS,
          overrideAccess: true,
          select: {
            form: true,
            submissionData: true,
            hofReviewStatus: true,
            hofFeedback: true,
            hofReviewLog: true,
            approved: true,
            createdAt: true,
          },
        })
  ) as { docs: StoredSubmission[]; totalDocs: number };
  if (submissions.totalDocs > submissions.docs.length) {
    logger.warn('A Hof has more submissions than its dashboard shows', {
      'hof_dashboard.hof_id': hofId,
      'hof_dashboard.submissions': submissions.totalDocs,
    });
  }

  const fieldsByForm = new Map(forms.map((form) => [form.id, fieldsOf(form)]));
  const fileIds = submissions.docs.flatMap((submission) => {
    const fields = fieldsByForm.get(idOf(submission.form) ?? '') ?? [];
    const fileFields = new Set(
      fields.filter((field) => field.blockType === 'fileUpload').map((field) => field.name),
    );
    return (submission.submissionData ?? [])
      .filter((answer) => fileFields.has(answer.field))
      .flatMap((answer) => answer.value.split(',').map((id) => id.trim()))
      .filter((id) => id !== '');
  });
  const { docs: storedFiles } =
    fileIds.length === 0
      ? { docs: [] }
      : await payload.find({
          collection: 'form_collection',
          // An answer names its files by id, and anyone can write any id into it: only a file
          // that belongs to one of these submissions shows, so no other Hof's file is listed.
          where: {
            and: [
              { id: { in: fileIds } },
              { formSubmission: { in: submissions.docs.map((submission) => submission.id) } },
            ],
          },
          depth: 0,
          limit: fileIds.length,
          pagination: false,
          overrideAccess: true,
          select: {
            originalFilename: true,
            filename: true,
            filesize: true,
            mimeType: true,
            formSubmission: true,
          },
        });
  // by submission, so an answer only finds the files of its own submission
  const filesBySubmission = new Map<string, Map<string, HofDashboardFile>>();
  for (const file of storedFiles) {
    const submissionId = idOf(file.formSubmission);
    if (submissionId === undefined) continue;
    const ofSubmission = filesBySubmission.get(submissionId) ?? new Map<string, HofDashboardFile>();
    ofSubmission.set(file.id, {
      id: file.id,
      name: file.originalFilename ?? file.filename ?? file.id,
      // served by the route that checks the Hof, not by Payload's own file URL
      url: `/api/form-file/${file.id}`,
      size: file.filesize ?? undefined,
      mimeType: file.mimeType ?? undefined,
    });
    filesBySubmission.set(submissionId, ofSubmission);
  }

  const now = new Date();
  // an editor's order first; forms without a position after those with one
  const positionOf = (formId: string): number =>
    forms.find((form) => form.id === formId)?.hofDashboard?.position ?? Number.MAX_SAFE_INTEGER;
  const dashboardForms: HofDashboardForm[] = forms
    .flatMap((form): HofDashboardForm[] => {
      const settingsOfForm = form.hofDashboard;
      const area = settingsOfForm?.area;
      const fields = fieldsByForm.get(form.id) ?? [];
      const hofField = fields.find((field) => field.blockType === 'hofSelection')?.name;
      if (area === undefined || area === null || hofField === undefined) return [];

      const mode = settingsOfForm?.entries ?? 'versions';
      const own = submissions.docs.filter((submission) => idOf(submission.form) === form.id);
      const entries = own.map((submission, index): HofDashboardEntry => {
        const values = new Map(
          (submission.submissionData ?? []).map((answer) => [answer.field, answer.value]),
        );
        const status = statusOf(submission);
        const titleField = settingsOfForm?.titleField;
        const title =
          typeof titleField === 'string' && titleField !== '' ? values.get(titleField) : undefined;
        return {
          id: submission.id,
          submittedAt: submission.createdAt,
          title: title === '' ? undefined : title,
          status,
          feedback: submission.hofFeedback ?? undefined,
          answers: toAnswers(
            fields,
            values,
            filesBySubmission.get(submission.id) ?? new Map<string, HofDashboardFile>(),
            locale,
          ),
          reviewStatus: submission.hofReviewStatus ?? undefined,
          feedbackBy: feedbackAuthor(submission),
          // the history is the Ressort's working record, not the Hof's
          reviewLog: isReviewer
            ? (submission.hofReviewLog ?? [])
                .map((change): HofReviewLogEntry => ({
                  at: change.changedAt,
                  by: change.reviewerName ?? '',
                  status: change.status ?? 'submitted',
                  feedback: change.feedback ?? '',
                }))
                .toReversed()
            : [],
          // only the version that counts; an earlier one is what the Ressort answered on.
          // A reviewer answers a submission; taking it back is the Hof's.
          withdrawable:
            !isReviewer && status === 'submitted' && (mode === 'entries' || index === 0),
        };
      });

      const newest = own[0];
      const initialValues = Object.fromEntries(
        fields
          .filter((field) => field.blockType === 'materialList')
          .flatMap((field) => {
            const stored = newest?.submissionData?.find((answer) => answer.field === field.name);
            // only lines the list still offers: a removed one would be refused on sending
            const listed = new Set(field.items?.map((item) => item.id));
            const lines = (parseMaterialAnswer(stored?.value) ?? []).filter((line) =>
              listed.has(line.id),
            );
            return lines.length === 0 ? [] : [[field.name, serializeMaterialAnswer(lines)]];
          }),
      );
      const deadline = settingsOfForm?.deadline ?? undefined;
      return [
        {
          id: form.id,
          area,
          title:
            typeof settingsOfForm?.title === 'string' && settingsOfForm.title !== ''
              ? settingsOfForm.title
              : form.title,
          description: settingsOfForm?.description ?? undefined,
          deadline,
          closed:
            settingsOfForm?.closesAtDeadline === true &&
            deadline !== undefined &&
            daysUntil(deadline, now) < 0,
          mode,
          hofField,
          initialValues,
          form: toRenderedForm(form),
          entries,
        },
      ];
    })
    .toSorted((a, b) => {
      const byPosition = positionOf(a.id) - positionOf(b.id);
      return byPosition === 0 ? a.title.localeCompare(b.title, locale) : byPosition;
    });

  const deadlines: HofDashboardDeadline[] = (settings.deadlines ?? [])
    .toSorted((a, b) => a.date.localeCompare(b.date))
    .map((deadline, index) => ({
      id: deadline.id ?? String(index),
      date: deadline.date,
      title: deadline.title,
      area: deadline.area,
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
    forms: dashboardForms,
    documents,
    isReviewer,
  };
};
