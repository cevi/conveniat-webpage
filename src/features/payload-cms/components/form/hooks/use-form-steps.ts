import type {
  ConditionedBlock,
  FormFieldBlock,
  FormSection,
  JobSelectionBlock,
} from '@/features/payload-cms/components/form/types';
import { getFormStorageKey } from '@/features/payload-cms/components/form/utils/get-form-storage-key';
import { useEffect, useState } from 'react';
import type { FieldName, UseFormReturn } from 'react-hook-form';

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
      // scroll to element - 60px to account for sticky nav
      const topPos = element.getBoundingClientRect().top + window.pageYOffset - 100;
      window.scrollTo({ top: topPos, behavior: 'smooth' });
    }
  }
};

export const useFormSteps = (
  sections: FormSection[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formMethods: UseFormReturn<any>,
  formId?: string,
): UseFormStepsReturn => {
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

  // Save step to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof formId === 'string' && formId !== '') {
      sessionStorage.setItem(getFormStorageKey(formId, 'step'), String(currentStepIndex));
    }
  }, [formId, currentStepIndex]);

  const currentActualStep = sections[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === sections.length - 1;

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
      fieldsToProcess: (FormFieldBlock | ConditionedBlock | JobSelectionBlock)[],
    ): void {
      for (const field of fieldsToProcess) {
        if (field.blockType === 'conditionedBlock') {
          const { field: conditionField, value: targetValue } = field.displayCondition;
          const watchValue = formMethods.watch(conditionField) as
            | string
            | boolean
            | number
            | undefined;
          const condition = (watchValue ?? '').toString() === targetValue;

          if (condition) {
            processFields(field.fields);
          }
        } else if ('name' in field && field.name !== '') {
          fieldNames.push(field.name);
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
      setCurrentStepIndex((previous) => previous + 1);
      scrollToTop(formId);
    }
    return isValid;
  };

  const previous = (event?: React.MouseEvent): void => {
    event?.preventDefault();
    if (!isFirstStep) {
      setCurrentStepIndex((previous_) => previous_ - 1);
    }
    scrollToTop(formId);
  };

  return {
    currentStepIndex,
    setCurrentStepIndex,
    currentActualStep,
    steps: sections,
    isFirstStep,
    isLastStep,
    next,
    prev: previous,
  };
};
