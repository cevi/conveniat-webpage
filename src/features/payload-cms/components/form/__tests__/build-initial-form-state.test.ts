import {
  buildEmptyFormState,
  buildInitialFormState,
} from '@/features/payload-cms/components/form/build-initial-form-state';
import type {
  ExtendedFormType,
  FormFieldBlock,
} from '@/features/payload-cms/components/form/types';

describe('buildInitialFormState', () => {
  it('should set checkbox default value to true when defaultValue is true', () => {
    const fields = [
      {
        blockType: 'checkbox',
        name: 'newsletter',
        defaultValue: true,
      } as unknown as FormFieldBlock,
    ];

    const state = buildInitialFormState(fields);
    expect(state).toEqual({
      newsletter: true,
    });
  });

  it('should set checkbox default value to false when defaultValue is false or undefined', () => {
    const fields = [
      {
        blockType: 'checkbox',
        name: 'terms',
        defaultValue: false,
      } as unknown as FormFieldBlock,
      {
        blockType: 'checkbox',
        name: 'marketing',
      } as unknown as FormFieldBlock,
    ];

    const state = buildInitialFormState(fields);
    expect(state).toEqual({
      terms: false,
      marketing: false,
    });
  });
});

describe('buildEmptyFormState', () => {
  it('should extract default values correctly for form sections including checkboxes', () => {
    const config: ExtendedFormType = {
      id: 'test-form',
      title: 'Test Form',
      autocomplete: true,
      _localized_status: { published: true },
      sections: [
        {
          id: 'sec-1',
          formSection: {
            id: 'fs-1',
            sectionTitle: 'Section 1',
            layout: 'standard',
            fields: [
              {
                blockType: 'text',
                name: 'fullname',
                defaultValue: 'John Doe',
              } as unknown as FormFieldBlock,
              {
                blockType: 'checkbox',
                name: 'newsletter',
                defaultValue: true,
              } as unknown as FormFieldBlock,
              {
                blockType: 'checkbox',
                name: 'consent',
                defaultValue: false,
              } as unknown as FormFieldBlock,
            ],
          },
        },
      ],
    } as unknown as ExtendedFormType;

    const state = buildEmptyFormState(config);
    expect(state).toEqual({
      fullname: 'John Doe',
      newsletter: true,
      consent: false,
    });
  });

  it('should exclude conditionedBlock fields from initial form state so hidden fields remain undefined', () => {
    const config: ExtendedFormType = {
      id: 'test-form-conditioned',
      title: 'Test Form',
      autocomplete: true,
      _localized_status: { published: true },
      sections: [
        {
          id: 'sec-1',
          formSection: {
            id: 'fs-1',
            sectionTitle: 'Section 1',
            layout: 'standard',
            fields: [
              {
                blockType: 'conditionedBlock',
                displayCondition: { field: 'show_extra', value: 'true' },
                fields: [
                  {
                    blockType: 'checkbox',
                    name: 'nested_checkbox',
                    defaultValue: true,
                  } as unknown as FormFieldBlock,
                ],
              },
            ],
          },
        },
      ],
    } as unknown as ExtendedFormType;

    const state = buildEmptyFormState(config);
    expect(state).toEqual({});
  });
});
