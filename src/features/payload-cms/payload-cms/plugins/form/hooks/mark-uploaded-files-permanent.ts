import type { FormSubmission } from '@/features/payload-cms/payload-types';
import type { CollectionAfterChangeHook } from 'payload';

export const markUploadedFilesPermanent: CollectionAfterChangeHook<FormSubmission> = async ({
  doc,
  req,
  operation,
}) => {
  if (operation !== 'create') return doc;
  if (!Array.isArray(doc.submissionData) || doc.submissionData.length === 0) return doc;

  for (const item of doc.submissionData) {
    const rawValue = item.value as unknown;
    if (rawValue === null || rawValue === undefined) {
      continue;
    }
    const valueString = String(item.value);
    if (valueString.length === 0) continue;

    const documentIds = valueString
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    for (const documentId of documentIds) {
      try {
        const fileDocument = await req.payload.findByID({
          collection: 'form_collection',
          id: documentId,
        });

        if (fileDocument.isTemporary) {
          await req.payload.update({
            collection: 'form_collection',
            id: documentId,
            data: {
              isTemporary: false,
              formSubmission: doc.id,
              form: typeof doc.form === 'string' ? doc.form : doc.form.id,
            },
          });
        }
      } catch {
        // Value is not a form_collection document ID, skip
      }
    }
  }

  return doc;
};
