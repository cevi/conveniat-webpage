import {
  type FormBlockData,
  migrateFormDocumentPlaceholders,
  migrateFormPlaceholders,
  migratePlaceholderInBlock,
  migrateSectionsPlaceholders,
} from '@/features/payload-cms/payload-cms/initialization/migrate-form-placeholders';
import type { Payload } from 'payload';

const createMockPayload = ({
  forms = [],
  versions = [],
  throwOnUpdate = false,
}: {
  forms?: Record<string, unknown>[];
  versions?: Record<string, unknown>[];
  throwOnUpdate?: boolean;
} = {}): {
  payload: Payload;
  updateOne: jest.Mock;
  updateVersion: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
} => {
  const updateOne = jest.fn().mockImplementation(() => {
    if (throwOnUpdate) return Promise.reject(new Error('Update failed'));
    return Promise.resolve({});
  });
  const updateVersion = jest.fn().mockImplementation(() => {
    if (throwOnUpdate) return Promise.reject(new Error('Update failed'));
    return Promise.resolve({});
  });
  const info = jest.fn();
  const warn = jest.fn();
  const error = jest.fn();

  const payload = {
    find: jest.fn().mockResolvedValue({ docs: forms }),
    findVersions: jest.fn().mockResolvedValue({ docs: versions }),
    db: {
      updateOne,
      updateVersion,
    },
    logger: {
      info,
      warn,
      error,
      debug: jest.fn(),
    },
  } as unknown as Payload;

  return { payload, updateOne, updateVersion, info, warn, error };
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
      // eslint-disable-next-line unicorn/no-null
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
    /* eslint-disable unicorn/no-null */
    expect(migrateSectionsPlaceholders(null)).toBe(false);
    expect(migrateSectionsPlaceholders([null, {}, { formSection: null }])).toBe(false);
    /* eslint-enable unicorn/no-null */
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
  it('migrates forms and versions with string placeholders', async () => {
    const formDocument = {
      id: 'form-1',
      title: { de: 'Anmeldeformular' },
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

    const versionDocument = {
      id: 'ver-1',
      parent: 'form-1',
      version: {
        title: { de: 'Anmeldeformular v1' },
        sections: [
          {
            formSection: {
              fields: [{ id: 'f-3', blockType: 'select', placeholder: 'Bitte auswählen' }],
            },
          },
        ],
      },
    };

    const { payload, updateOne, updateVersion, info } = createMockPayload({
      forms: [formDocument],
      versions: [versionDocument],
    });

    await migrateFormPlaceholders(payload);

    expect(payload.find).toHaveBeenCalledWith({
      collection: 'forms',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      locale: 'all',
    });
    expect(payload.findVersions).toHaveBeenCalledWith({
      collection: 'forms',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      locale: 'all',
    });

    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateOne).toHaveBeenCalledWith({
      collection: 'forms',
      where: { id: { equals: 'form-1' } },
      data: {
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
    });

    expect(updateVersion).toHaveBeenCalledTimes(1);
    expect(updateVersion).toHaveBeenCalledWith({
      collection: 'forms',
      id: 'ver-1',
      where: { id: { equals: 'ver-1' } },
      versionData: {
        id: 'ver-1',
        parent: 'form-1',
        version: {
          title: { de: 'Anmeldeformular v1' },
          sections: [
            {
              formSection: {
                fields: [
                  { id: 'f-3', blockType: 'select', placeholder: { de: 'Bitte auswählen' } },
                ],
              },
            },
          ],
        },
      },
    });

    expect(info).toHaveBeenCalledWith(
      { forms: 1, versions: 1 },
      'Migrated placeholders to localized format across 1 forms and 1 versions',
    );
  });

  it('is completely idempotent when placeholders are already localized', async () => {
    const alreadyMigratedForm = {
      id: 'form-2',
      sections: [
        {
          formSection: {
            fields: [{ blockType: 'email', placeholder: { de: 'kontakt@cevi.ch' } }],
          },
        },
      ],
    };
    const alreadyMigratedVersion = {
      id: 'ver-2',
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

    const { payload, updateOne, updateVersion, info } = createMockPayload({
      forms: [alreadyMigratedForm],
      versions: [alreadyMigratedVersion],
    });

    await migrateFormPlaceholders(payload);

    expect(updateOne).not.toHaveBeenCalled();
    expect(updateVersion).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
  });

  it('logs a warning when an individual form or version update fails, and continues', async () => {
    const formDocument = {
      id: 'form-fail',
      sections: [
        {
          formSection: {
            fields: [{ blockType: 'email', placeholder: 'fail@cevi.ch' }],
          },
        },
      ],
    };

    const versionDocument = {
      id: 'ver-fail',
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

    const { payload, updateOne, updateVersion, warn } = createMockPayload({
      forms: [formDocument],
      versions: [versionDocument],
      throwOnUpdate: true,
    });

    await migrateFormPlaceholders(payload);

    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(updateVersion).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ formId: 'form-fail' }),
      'Failed to migrate placeholders on form',
    );
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ versionId: 'ver-fail' }),
      'Failed to migrate placeholders on form version',
    );
  });

  it('logs error if finding forms throws an exception', async () => {
    const { payload, error } = createMockPayload();
    payload.find = jest.fn().mockRejectedValue(new Error('Database unavailable'));

    await migrateFormPlaceholders(payload);

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) as unknown }),
      'Migrating form placeholders failed',
    );
  });
});
