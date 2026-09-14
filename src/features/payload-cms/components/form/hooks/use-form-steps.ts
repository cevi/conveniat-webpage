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

type SectionField = FormFieldBlock | ConditionedBlock | JobSelectionBlock | DateSlotSelectionBlock;

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

/** Every field name under a list of blocks, conditioned ones included. */
const collectFieldNames = (fields: SectionField[]): string[] =>
  fields.flatMap((field) =>
    field.blockType === 'conditionedBlock' ? collectFieldNames(field.fields) : getFieldNames(field),
  );

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

  /*
   * A value-based key rather than the filtered array itself: `useWatch` hands back a fresh
   * array every render, so memoizing on it would give `steps` a new identity each time and
   * re-run everything downstream — including the reset below.
   */
  const visibilityKey = sections
    .map((section, index) => {
      if (conditionFieldNames[index] === '') return '1';
      const expected = section.displayCondition?.value ?? '';
      return String(conditionValues[index] ?? '') === expected ? '1' : '0';
    })
    .join('');

  const steps = useMemo(
    () => sections.filter((_, index) => visibilityKey[index] === '1'),
    [sections, visibilityKey],
  );

  /*
   * Answers given on a branch the helper then left would otherwise stay in the form state
   * and be submitted: hiding a section only unmounts it, react-hook-form keeps the values.
   * `unregister` rather than `resetField`, because resetting restores the empty-string
   * default and the field would still travel with the payload — a slot registration would
   * carry phantom job answers into the submission and the export.
   *
   * A field another section is gated on is never dropped: unregistering it would flip that
   * section's visibility, which would recompute this list, which would flip it back.
   */
  const hiddenFieldNames = useMemo(() => {
    const gateFields = new Set(conditionFieldNames.filter((name) => name !== ''));
    return sections
      .filter((_, index) => visibilityKey[index] !== '1')
      .flatMap((section) => collectFieldNames(section.fields))
      .filter((name) => !gateFields.has(name));
  }, [sections, visibilityKey, conditionFieldNames]);

  const { unregister } = formMethods;
  useEffect(() => {
    if (hiddenFieldNames.length > 0) unregister(hiddenFieldNames);
  }, [hiddenFieldNames, unregister]);

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
