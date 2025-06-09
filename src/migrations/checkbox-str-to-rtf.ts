import { Form } from '@/features/payload-cms/payload-types';
import { type MigrateUpArgs } from '@payloadcms/db-mongodb';

interface OldLabelType {
  de?: string;
  en?: string;
  fr?: string;
}

export async function up({ payload }: MigrateUpArgs): Promise<void> {
  const formsCollection = payload.db.collections['forms']?.collection;

  if (!formsCollection) return;

  // Fetch all form documents
  const formsCursor = formsCollection.find({});

  while (await formsCursor.hasNext()) {
    const form = (await formsCursor.next()) as unknown as Form & { _id: string };

    let updated = false;

    const updatedSections = form.sections?.map((section) => {
      if (!Array.isArray(section.formSection.fields)) return section;

      const formSection = section.formSection;

      const updatedFields = formSection.fields?.map((field) => {
        if (field.blockType === 'checkbox') {
          const oldLabel = field.label as unknown as OldLabelType;

          const hasStringLabels = oldLabel?.de || oldLabel?.en || oldLabel?.fr;
          if (!hasStringLabels) return field;

          if (
            field.label['de']?.root ??
            (false || field.label['en']?.root) ??
            (false || field.label['fr']?.root) ??
            false
          ) {
            return field;
          }

          updated = true;

          const newFieldLabel = {
            de: {
              root: {
                children: [
                  {
                    children: [
                      {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: oldLabel.de ?? '',
                        type: 'text',
                        version: 1,
                      },
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1,
                    textFormat: 0,
                    textStyle: '',
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1,
              },
            },
            en: {
              root: {
                children: [
                  {
                    children: [
                      {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: oldLabel.en ?? '',
                        type: 'text',
                        version: 1,
                      },
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1,
                    textFormat: 0,
                    textStyle: '',
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1,
              },
            },
            fr: {
              root: {
                children: [
                  {
                    children: [
                      {
                        detail: 0,
                        format: 0,
                        mode: 'normal',
                        style: '',
                        text: oldLabel.fr ?? '',
                        type: 'text',
                        version: 1,
                      },
                    ],
                    direction: 'ltr',
                    format: '',
                    indent: 0,
                    type: 'paragraph',
                    version: 1,
                    textFormat: 0,
                    textStyle: '',
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                type: 'root',
                version: 1,
              },
            },
          };

          return {
            ...field,
            label: {
              ...newFieldLabel,
            },
          };
        }
        return field;
      });

      return {
        ...section,
        formSection: { fields: updatedFields },
      };
    });

    if (updated) {
      await formsCollection.updateOne({ _id: form._id }, { $set: { sections: updatedSections } });
    }
  }
}
