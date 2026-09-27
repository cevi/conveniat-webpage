import {
  parseMaterialAnswer,
  serializeMaterialAnswer,
} from '@/features/payload-cms/components/form/utils/material-list';
import { LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionBeforeChangeHook } from 'payload';

interface MaterialListConfig {
  blockType?: string;
  name?: string;
  items?: { id?: string | null; name?: string | null; section?: string | null }[] | null;
  fields?: unknown[] | null;
}

/** Every material list of a form section, including those inside a conditioned block. */
const materialLists = (fields: unknown[] | null | undefined): MaterialListConfig[] =>
  (fields ?? []).flatMap((field): MaterialListConfig[] => {
    if (field === null || typeof field !== 'object') return [];
    const block = field as MaterialListConfig;
    if (block.blockType === 'materialList') return [block];
    if (block.blockType === 'conditionedBlock') return materialLists(block.fields);
    return [];
  });

/**
 * Writes the name and section each ordered material has in German into a new submission's
 * material lists. The browser sends the lines by id only; stored with their names, an order
 * still reads the same after its line is renamed or removed, and the Ressort reads every order
 * in one language. Runs after `validateFormSubmission`, which refused unknown lines.
 */
export const nameMaterialLines: CollectionBeforeChangeHook<FormSubmission> = async ({
  data,
  req,
  operation,
}) => {
  if (operation !== 'create' || data.form === undefined) return data;
  if (!Array.isArray(data.submissionData)) return data;

  const formId = typeof data.form === 'object' ? data.form.id : data.form;
  const form = await req.payload.findByID({
    collection: 'forms',
    id: formId,
    depth: 0,
    locale: LOCALE.DE,
    select: { sections: true },
    req,
  });
  const lists = form.sections.flatMap((section) =>
    materialLists(section.formSection.fields as unknown[] | null | undefined),
  );
  if (lists.length === 0) return data;

  for (const answer of data.submissionData) {
    const list = lists.find((candidate) => candidate.name === answer.field);
    const lines = list === undefined ? undefined : parseMaterialAnswer(answer.value);
    if (list === undefined || lines === undefined) continue;
    answer.value = serializeMaterialAnswer(
      lines.map((line) => {
        const item = list.items?.find((candidate) => candidate.id === line.id);
        return {
          id: line.id,
          name: item?.name ?? line.id,
          ...(typeof item?.section === 'string' && item.section !== ''
            ? { section: item.section }
            : {}),
          quantity: line.quantity,
        };
      }),
    );
  }
  return data;
};
