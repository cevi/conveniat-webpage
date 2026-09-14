import type {
  ConditionedBlock,
  DateSlotSelectionBlock,
  FormFieldBlock,
  FormSection,
  JobSelectionBlock,
} from '@/features/payload-cms/components/form/types';
import { getFormStorageKey } from '@/features/payload-cms/components/form/utils/get-form-storage-key';
import { useEffect, useMemo, useState } from 'react';
import type { FieldName, UseFormReturn } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

export interface UseFormStepsReturn {
  currentStepIndex: number;
  setCurrentStepIndex: (index: number | ((previous: number) => number)) => void;
  currentActualStep: FormSection | undefined; // Add undefined possibility
  steps: FormSection[];
  isFirstStep: boolean;
  isLastStep: boolean;
  next: (event?: React.MouseEvent) => Promise<boolean>;
  prev: (event?: React.MouseEvent) => void;
}

const scrollToTop = (formId?: string): void => {
  if (typeof globalThis !== 'undefined') {
    const element = formId ? document.querySelector(`#${CSS.escape(formId)}`) : undefined;
    if (element) {
      // scroll to element - 100px to account for sticky nav
      const topPos = element.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  }
};

/** Names of the fields a `dateSlotSelection` block registers — it owns up to two. */
const getFieldNames = (
  field: FormFieldBlock | JobSelectionBlock | DateSlotSelectionBlock,
): string[] => {
  const names: string[] = [];
  if ('name' in field && typeof field.name === 'string' && field.name !== '') {
    names.push(field.name);
  }
  if (
    field.blockType === 'dateSlotSelection' &&
    typeof field.ressortName === 'string' &&
    field.ressortName !== ''
  ) {
    names.push(field.ressortName);
  }
  return names;
};

export const useFormSteps = (
  sections: FormSection[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formMethods: UseFormReturn<any>,
  formId?: string,
): UseFormStepsReturn => {
  /*
   * A section can be gated on an answer from an earlier step, so the list of steps is
   * derived from the current form values rather than from the config alone. `useWatch`
   * rather than `watch` keeps the subscription scoped to the trigger fields.
   */
  const conditionFieldNames = useMemo(
    () =>
      sections.map((section) => {
        const field = section.displayCondition?.field;
        return typeof field === 'string' && field !== '' ? field : '';
      }),
    [sections],
  );

  const conditionValues = useWatch({
    control: formMethods.control,
    name: conditionFieldNames,
  }) as (string | number | boolean | undefined)[];

  const steps = useMemo(
    () =>
      sections.filter((section, index) => {
        if (conditionFieldNames[index] === '') return true;
        const expected = section.displayCondition?.value ?? '';
        return String(conditionValues[index] ?? '') === expected;
      }),
    [sections, conditionFieldNames, conditionValues],
  );

  /*
   * Initialize state from sessionStorage if available to avoid layout shift
   * and "setState during render" lint errors.
   */
  const [currentStepIndex, setCurrentStepIndex] = useState(() => {
    if (typeof globalThis !== 'undefined' && typeof formId === 'string' && formId !== '') {
      const savedStep = sessionStorage.getItem(getFormStorageKey(formId, 'step'));
      if (savedStep !== null) {
        return Number(savedStep);
      }
    }
    return 0;
  });

  /*
   * Switching the answer that gates a section shortens the list of steps, which can leave
   * the index past its end — most visibly when the restored session index pointed at a
   * step that is now skipped. Clamping on read rather than writing the state back keeps
   * this out of an effect: every consumer, including `next` and `prev`, works off the
   * clamped value, so the stored index never has to be corrected.
   */
  const clampedStepIndex =
    steps.length === 0 ? 0 : Math.min(Math.max(currentStepIndex, 0), steps.length - 1);

  // Save step to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof formId === 'string' && formId !== '') {
      sessionStorage.setItem(getFormStorageKey(formId, 'step'), String(clampedStepIndex));
    }
  }, [formId, clampedStepIndex]);

  const currentActualStep = steps[clampedStepIndex];
  const isFirstStep = clampedStepIndex === 0;
  const isLastStep = clampedStepIndex === steps.length - 1;

  // Helper to get fields currently visible (handling conditionals)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getVisibleFields = (): FieldName<any>[] => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fieldNames: FieldName<any>[] = [];
    if (!currentActualStep || !('fields' in currentActualStep)) {
      return [];
    }

    // Explicitly define recursive function to avoid "processFields is undefined" issues if declared as const fn
    function processFields(
      fieldsToProcess: (
        FormFieldBlock | ConditionedBlock | JobSelectionBlock | DateSlotSelectionBlock
      )[],
    ): void {
      for (const field of fieldsToProcess) {
        if (field.blockType === 'conditionedBlock') {
          const { field: conditionField, value: targetValue } = field.displayCondition;
          const watchValue = formMethods.watch(conditionField) as
            string | boolean | number | undefined;
          const condition = (watchValue ?? '').toString() === targetValue;

          if (condition) {
            processFields(field.fields);
          }
        } else {
          fieldNames.push(...getFieldNames(field));
        }
      }
    }

    processFields(currentActualStep.fields);
    return fieldNames;
  };

  const next = async (event?: React.MouseEvent): Promise<boolean> => {
    event?.preventDefault();

    // Trigger validation for visible fields
    const fields = getVisibleFields();

    const isValid = await formMethods.trigger(fields, { shouldFocus: true });

    if (isValid && !isLastStep) {
      setCurrentStepIndex(clampedStepIndex + 1);
      scrollToTop(formId);
    }
    return isValid;
  };

  const previous = (event?: React.MouseEvent): void => {
    event?.preventDefault();
    if (!isFirstStep) {
      setCurrentStepIndex(clampedStepIndex - 1);
    }
    scrollToTop(formId);
  };

  return {
    currentStepIndex: clampedStepIndex,
    setCurrentStepIndex,
    currentActualStep,
    steps,
    isFirstStep,
    isLastStep,
    next,
    prev: previous,
  };
};
