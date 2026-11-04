import {
  type FormBlockData,
  migrateFormDocumentPlaceholders,
  migrateFormPlaceholders,
  migratePlaceholderInBlock,
  migrateSectionsPlaceholders,
} from '@/features/payload-cms/payload-cms/initialization/migrate-form-placeholders';
import type { BasePayload } from 'payload';

/** A raw Mongo collection holding `documents`, as the migration reads and writes it. */
const createMockCollection = (
  documents: Record<string, unknown>[],
  throwOnUpdate: boolean,
): { find: jest.Mock; updateOne: jest.Mock } => ({
  find: jest.fn().mockReturnValue(documents),
  updateOne: jest.fn().mockImplementation(() => {
    if (throwOnUpdate) return Promise.reject(new Error('Update failed'));
    return Promise.resolve({});
  }),
});

const createMockPayload = ({
  forms = [],
  versions = [],
  throwOnUpdate = false,
}: {
  forms?: Record<string, unknown>[];
  versions?: Record<string, unknown>[];
  throwOnUpdate?: boolean;
} = {}): {
  payload: BasePayload;
  formCollection: { find: jest.Mock; updateOne: jest.Mock };
  versionCollection: { find: jest.Mock; updateOne: jest.Mock };
  info: jest.Mock;
  error: jest.Mock;
} => {
  const formCollection = createMockCollection(forms, throwOnUpdate);
  const versionCollection = createMockCollection(versions, throwOnUpdate);
  const info = jest.fn();
  const error = jest.fn();

  const payload = {
    db: {
      collections: { forms: { collection: formCollection } },
      versions: { forms: { collection: versionCollection } },
    },
    logger: { info, warn: jest.fn(), error, debug: jest.fn() },
  } as unknown as BasePayload;

  return { payload, formCollection, versionCollection, info, error };
};

describe('migratePlaceholderInBlock', () => {
  it('rewrites string placeholders on email, number, and select blocks to { de: value }', () => {
    const emailBlock: FormBlockData = {
      blockType: 'email',
      placeholder: 'user@example.com',
    };
    const numberBlock: FormBlockData = {
      blockType: 'number',
      placeholder: '42',
    };
    const selectBlock: FormBlockData = {
      blockType: 'select',
      placeholder: 'Bitte wählen',
    };

    expect(migratePlaceholderInBlock(emailBlock)).toBe(true);
    expect(emailBlock.placeholder).toEqual({ de: 'user@example.com' });

    expect(migratePlaceholderInBlock(numberBlock)).toBe(true);
    expect(numberBlock.placeholder).toEqual({ de: '42' });

    expect(migratePlaceholderInBlock(selectBlock)).toBe(true);
    expect(selectBlock.placeholder).toEqual({ de: 'Bitte wählen' });
  });

  it('leaves already localized placeholders untouched', () => {
    const block: FormBlockData = {
      blockType: 'email',
      placeholder: { de: 'de@example.com', fr: 'fr@example.com' },
    };

    expect(migratePlaceholderInBlock(block)).toBe(false);
    expect(block.placeholder).toEqual({ de: 'de@example.com', fr: 'fr@example.com' });
  });

  it('leaves blocks without a placeholder untouched', () => {
    const blockWithoutPlaceholder: FormBlockData = {
      blockType: 'email',
    };
    const blockWithNull: FormBlockData = {
      blockType: 'email',
      placeholder: null,
    };

    expect(migratePlaceholderInBlock(blockWithoutPlaceholder)).toBe(false);
    expect(migratePlaceholderInBlock(blockWithNull)).toBe(false);
  });

  it('does not rewrite placeholders on other block types like text or textarea', () => {
    const textBlock: FormBlockData = {
      blockType: 'text',
      placeholder: 'Text placeholder',
    };
    const textareaBlock: FormBlockData = {
      blockType: 'textarea',
      placeholder: 'Textarea placeholder',
    };

    expect(migratePlaceholderInBlock(textBlock)).toBe(false);
    expect(textBlock.placeholder).toBe('Text placeholder');

    expect(migratePlaceholderInBlock(textareaBlock)).toBe(false);
    expect(textareaBlock.placeholder).toBe('Textarea placeholder');
  });

  it('recursively migrates nested blocks inside fields (e.g. conditionedBlock)', () => {
    const conditionedBlock: {
      blockType: string;
      fields: Array<{ blockType: string; placeholder: unknown }>;
    } = {
      blockType: 'conditionedBlock',
      fields: [
        {
          blockType: 'email',
          placeholder: 'nested@example.com',
        },
        {
          blockType: 'number',
          placeholder: '99',
        },
      ],
    };

    expect(migratePlaceholderInBlock(conditionedBlock)).toBe(true);
    expect(conditionedBlock.fields[0]?.placeholder).toEqual({ de: 'nested@example.com' });
    expect(conditionedBlock.fields[1]?.placeholder).toEqual({ de: '99' });
  });
});

describe('migrateSectionsPlaceholders', () => {
  it('migrates placeholders across multiple sections and fields', () => {
    const sections = [
      {
        formSection: {
          fields: [
            { blockType: 'email', placeholder: 'first@example.com' },
            { blockType: 'text', placeholder: { de: 'Already localized' } },
          ],
        },
      },
      {
        formSection: {
          fields: [{ blockType: 'select', placeholder: 'Select option' }],
        },
      },
    ];

    expect(migrateSectionsPlaceholders(sections)).toBe(true);
    expect(sections[0]?.formSection.fields[0]?.placeholder).toEqual({ de: 'first@example.com' });
    expect(sections[1]?.formSection.fields[0]?.placeholder).toEqual({ de: 'Select option' });
  });

  it('migrates placeholders when section has direct fields array', () => {
    const sections = [
      {
        fields: [{ blockType: 'email', placeholder: 'direct@example.com' }],
      },
    ];

    expect(migrateSectionsPlaceholders(sections)).toBe(true);
    expect(sections[0]?.fields[0]?.placeholder).toEqual({ de: 'direct@example.com' });
  });

  it('returns false and leaves valid structures unchanged when already migrated', () => {
    const sections = [
      {
        formSection: {
          fields: [{ blockType: 'email', placeholder: { de: 'first@example.com' } }],
        },
      },
    ];

    expect(migrateSectionsPlaceholders(sections)).toBe(false);
  });

  it('handles invalid or non-array section values gracefully', () => {
    expect(migrateSectionsPlaceholders()).toBe(false);
    expect(migrateSectionsPlaceholders(null)).toBe(false);
    expect(migrateSectionsPlaceholders([null, {}, { formSection: null }])).toBe(false);
  });
});

describe('migrateFormDocumentPlaceholders', () => {
  it('migrates both sections and top-level fields if present', () => {
    const formDocument: {
      sections: Array<{
        formSection: { fields: Array<{ blockType: string; placeholder: unknown }> };
      }>;
      fields: Array<{ blockType: string; placeholder: unknown }>;
    } = {
      sections: [
        {
          formSection: {
            fields: [{ blockType: 'email', placeholder: 'sec@example.com' }],
          },
        },
      ],
      fields: [{ blockType: 'number', placeholder: '10' }],
    };

    expect(migrateFormDocumentPlaceholders(formDocument)).toBe(true);
    expect(formDocument.sections[0]?.formSection.fields[0]?.placeholder).toEqual({
      de: 'sec@example.com',
    });
    expect(formDocument.fields[0]?.placeholder).toEqual({ de: '10' });
  });
});

describe('migrateFormPlaceholders', () => {
  it('sets only the migrated fields of forms and versions', async () => {
    const formDocument = {
      _id: 'form-1',
      sections: [
        {
          formSection: {
            fields: [
              { id: 'f-1', blockType: 'email', placeholder: 'kontakt@cevi.ch' },
              { id: 'f-2', blockType: 'number', placeholder: '1' },
            ],
          },
        },
      ],
    };

    // an older version whose labels predate their localization, which a cast against the
    // current schema rejects
    const versionDocument = {
      _id: 'ver-1',
      version: {
        sections: [
          {
            formSection: {
              sectionTitle: 'Anmeldung',
              fields: [
                { id: 'f-3', blockType: 'select', label: 'Hof', placeholder: 'Bitte auswählen' },
              ],
            },
          },
        ],
      },
    };

    const { payload, formCollection, versionCollection, info } = createMockPayload({
      forms: [formDocument],
      versions: [versionDocument],
    });

    await migrateFormPlaceholders(payload);

    expect(formCollection.updateOne).toHaveBeenCalledWith(
      { _id: 'form-1' },
      {
        $set: {
          sections: [
            {
              formSection: {
                fields: [
                  { id: 'f-1', blockType: 'email', placeholder: { de: 'kontakt@cevi.ch' } },
                  { id: 'f-2', blockType: 'number', placeholder: { de: '1' } },
                ],
              },
            },
          ],
        },
      },
    );
    expect(versionCollection.updateOne).toHaveBeenCalledWith(
      { _id: 'ver-1' },
      {
        $set: {
          'version.sections': [
            {
              formSection: {
                sectionTitle: 'Anmeldung',
                fields: [
                  {
                    id: 'f-3',
                    blockType: 'select',
                    label: 'Hof',
                    placeholder: { de: 'Bitte auswählen' },
                  },
                ],
              },
            },
          ],
        },
      },
    );
    expect(info).toHaveBeenCalledWith(
      { forms: 1, versions: 1 },
      'Migrated placeholders to localized format across 1 forms and 1 versions',
    );
  });

  it('is completely idempotent when placeholders are already localized', async () => {
    const alreadyMigratedForm = {
      _id: 'form-2',
      sections: [
        {
          formSection: {
            fields: [{ blockType: 'email', placeholder: { de: 'kontakt@cevi.ch' } }],
          },
        },
      ],
    };
    const alreadyMigratedVersion = {
      _id: 'ver-2',
      version: {
        sections: [
          {
            formSection: {
              fields: [{ blockType: 'number', placeholder: { de: '5' } }],
            },
          },
        ],
      },
    };

    const { payload, formCollection, versionCollection, info } = createMockPayload({
      forms: [alreadyMigratedForm],
      versions: [alreadyMigratedVersion],
    });

    await migrateFormPlaceholders(payload);

    expect(formCollection.updateOne).not.toHaveBeenCalled();
    expect(versionCollection.updateOne).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it('logs an error when an individual form or version update fails, and continues', async () => {
    const formDocument = {
      _id: 'form-fail',
      sections: [
        {
          formSection: {
            fields: [{ blockType: 'email', placeholder: 'fail@cevi.ch' }],
          },
        },
      ],
    };

    const versionDocument = {
      _id: 'ver-fail',
      version: {
        sections: [
          {
            formSection: {
              fields: [{ blockType: 'select', placeholder: 'fail' }],
            },
          },
        ],
      },
    };

    const { payload, formCollection, versionCollection, error } = createMockPayload({
      forms: [formDocument],
      versions: [versionDocument],
      throwOnUpdate: true,
    });

    await migrateFormPlaceholders(payload);

    expect(formCollection.updateOne).toHaveBeenCalledTimes(1);
    expect(versionCollection.updateOne).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'forms', id: 'form-fail' }),
      'Failed to migrate the placeholders of a form document',
    );
    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'forms (versions)', id: 'ver-fail' }),
      'Failed to migrate the placeholders of a form document',
    );
  });

  // so Payload leaves the migration unrecorded and runs it again on the next start
  it('rejects when the forms cannot be read', async () => {
    const { payload, formCollection } = createMockPayload();
    formCollection.find.mockImplementation(() => {
      throw new Error('Database unavailable');
    });

    await expect(migrateFormPlaceholders(payload)).rejects.toThrow('Database unavailable');
  });
});
