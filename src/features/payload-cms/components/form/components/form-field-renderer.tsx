import { SubheadingH3 } from '@/components/ui/typography/subheading-h3';
import { fields as fieldComponents } from '@/features/payload-cms/components/form/fields';
import type {
  ConditionedBlock,
  FormFieldBlock,
  FormSection,
  JobSelectionBlock,
} from '@/features/payload-cms/components/form/types';
import React, { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';

interface FormFieldRendererProperties {
  section: FormSection;
  currentStepIndex: number;
  formId: string | undefined;
  renderMode?: 'all' | 'sidebar' | 'main';
}

const ConditionedField: React.FC<{
  block: ConditionedBlock;
  currentStepIndex: number;
  formId: string | undefined;
  renderMode: 'all' | 'sidebar' | 'main';
}> = ({ block, currentStepIndex, formId, renderMode }) => {
  const { control, resetField } = useFormContext();

  // Use useWatch for performance instead of watch() which re-renders the root
  const conditionedValue = useWatch({
    control,
    name: block.displayCondition.field,
  }) as string | number | boolean | undefined;

  const isVisible = String(conditionedValue ?? '') === block.displayCondition.value;

  // Side effect: Reset fields if hidden.
  useEffect(() => {
    if (!isVisible) {
      for (const f of block.fields) {
        if ('name' in f && f.name) {
          resetField(f.name);
        }
      }
    }
  }, [isVisible, block.fields, resetField]);

  if (!isVisible) return null; // eslint-disable-line unicorn/no-null

  return (
    <>
      {block.fields.map((field, index) => (
        <SingleField
          key={('id' in field && typeof field.id === 'string' ? field.id : undefined) || index}
          field={field}
          currentStepIndex={currentStepIndex}
          formId={formId}
          renderMode={renderMode}
        />
      ))}
    </>
  );
};

const SingleField: React.FC<{
  field: (FormFieldBlock | JobSelectionBlock) & { required?: boolean };
  currentStepIndex: number;
  formId: string | undefined;
  renderMode: 'all' | 'sidebar' | 'main';
}> = ({ field, currentStepIndex, formId, renderMode }) => {
  const Component = fieldComponents[field.blockType];
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext();

  if (!Component) {
    console.error(`Field type ${field.blockType} is not supported`);
    return null; // eslint-disable-line unicorn/no-null
  }

  // Placement logic
  const effectivePlacement =
    field.placement ?? (field.blockType === 'jobSelection' ? 'main' : 'sidebar');

  if (renderMode !== 'all' && renderMode !== effectivePlacement) {
    return null; // eslint-disable-line unicorn/no-null
  }

  return (
    <Component
      {...field}
      registerAction={register}
      control={control}
      errors={errors}
      required={field.required}
      currentStepIndex={currentStepIndex}
      formId={formId}
      renderMode={renderMode}
    />
  );
};

export const FormFieldRenderer: React.FC<FormFieldRendererProperties> = ({
  section,
  currentStepIndex,
  formId,
  renderMode = 'all',
}) => {
  return (
    <div className="space-y-4">
      {renderMode !== 'main' && section.sectionTitle && (
        <SubheadingH3 className="mt-0">{section.sectionTitle}</SubheadingH3>
      )}

      {section.fields.map((field, index) => {
        if (field.blockType === 'conditionedBlock') {
          return (
            <ConditionedField
              key={field.id || index}
              block={field}
              currentStepIndex={currentStepIndex}
              formId={formId}
              renderMode={renderMode}
            />
          );
        }
        return (
          <SingleField
            key={('id' in field && typeof field.id === 'string' ? field.id : undefined) || index}
            field={field}
            currentStepIndex={currentStepIndex}
            formId={formId}
            renderMode={renderMode}
          />
        );
      })}
    </div>
  );
};
