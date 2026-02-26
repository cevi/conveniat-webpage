'use client';

import type { Locale } from '@/types/types'; // Import Locale
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect, useMemo } from 'react';
import { FormProvider, useForm, useWatch, type FieldValues } from 'react-hook-form';

// Custom Hooks & Components
import { buildEmptyFormState } from '@/features/payload-cms/components/form/build-initial-form-state';
import { FormControls } from '@/features/payload-cms/components/form/components/form-controls';
import { FormFieldRenderer } from '@/features/payload-cms/components/form/components/form-field-renderer';
import { ProgressBar } from '@/features/payload-cms/components/form/components/progress-bar';
import { SubmissionMessage } from '@/features/payload-cms/components/form/components/submission-message';
import { useFormSteps } from '@/features/payload-cms/components/form/hooks/use-form-steps';
import { useFormSubmission } from '@/features/payload-cms/components/form/hooks/use-form-submission';
import { JobSelectionProvider } from '@/features/payload-cms/components/form/job-selection';
import type { ConditionedBlock, FormBlockType } from '@/features/payload-cms/components/form/types';
import { getFormStorageKey } from '@/features/payload-cms/components/form/utils/get-form-storage-key';
export type { FormBlockType } from '@/features/payload-cms/components/form/types';

export const FormBlock: React.FC<
  FormBlockType & { isPreviewMode?: boolean; withBorder?: boolean }
> = ({ form: config, isPreviewMode, withBorder = true }) => {
  const currentLocale = useCurrentLocale(i18nConfig);
  const locale = (currentLocale ?? 'en') as Locale;

  // 1. Initialize Form
  const formMethods = useForm<FieldValues>({
    mode: 'onChange',
    defaultValues: {},
  });

  // Restore form state from sessionStorage on mount
  useEffect(() => {
    if (typeof config.id === 'string' && config.id.length > 0) {
      const savedState = sessionStorage.getItem(getFormStorageKey(config.id, 'state'));
      if (typeof savedState === 'string' && savedState.length > 0) {
        try {
          const parsedState = JSON.parse(savedState) as Record<string, unknown>;

          formMethods.reset({ ...formMethods.getValues(), ...parsedState });
          // Note: We do NOT remove items here immediately,
          // because if the user navigates away and back again (e.g. login failed or multiple redirects), we might want it.
          // It is better to clear it upon successful submission.
        } catch (error) {
          console.error('Failed to parse saved form state:', error);
        }
      }
    }
  }, [config.id, formMethods]);

  // 2. Initialize Hooks
  // Map config.sections (wrappers) to FormSection[]
  const formSections = config.sections.map((s) => s.formSection);
  const {
    currentStepIndex,
    setCurrentStepIndex,
    steps,
    isFirstStep,
    isLastStep,
    next,
    prev,
    currentActualStep,
  } = useFormSteps(formSections, formMethods, config.id);

  const {
    submit,
    status,
    errorMessage,
    previewData,
    reset: resetSubmission,
  } = useFormSubmission({
    formId: config.id,
    config,
    isPreviewMode: isPreviewMode ?? false,
    locale,
  });

  const handleReset = (): void => {
    resetSubmission();
    formMethods.reset(buildEmptyFormState(config));
    setCurrentStepIndex(0);
  };

  // 3. Render
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const confirmationMessage = config.confirmationMessage;

  const isSplit = currentActualStep?.layout === 'split';

  // Calculate if the main column has any content to display
  const mainPlacementFields = useMemo(() => {
    if (!currentActualStep) return [];
    return currentActualStep.fields.filter((f) => {
      if (f.blockType === 'conditionedBlock') {
        const hasMainSub = f.fields.some(
          (sub) =>
            (sub.placement ?? (sub.blockType === 'jobSelection' ? 'main' : 'sidebar')) === 'main',
        );
        return f.placement === 'main' || hasMainSub;
      }
      const effectivePlacement =
        f.placement ?? (f.blockType === 'jobSelection' ? 'main' : 'sidebar');
      return effectivePlacement === 'main';
    });
  }, [currentActualStep]);

  const conditionedMainBlocks = useMemo(() => {
    return mainPlacementFields.filter(
      (f): f is ConditionedBlock => f.blockType === 'conditionedBlock',
    );
  }, [mainPlacementFields]);

  const { control } = formMethods;

  // Watch the fields that trigger these blocks
  const triggerValues = useWatch({
    control,
    name: conditionedMainBlocks.map((b) => b.displayCondition.field),
  });

  const hasVisibleConditionedMainBlock = useMemo(() => {
    if (conditionedMainBlocks.length === 0) return false;
    return conditionedMainBlocks.some((block, index) => {
      const vals = triggerValues as (string | boolean | number | undefined)[];
      const val = vals[index];
      return val !== undefined && String(val) === block.displayCondition.value;
    });
  }, [conditionedMainBlocks, triggerValues]);

  const hasStaticMainContent = useMemo(() => {
    return mainPlacementFields.some((f) => f.blockType !== 'conditionedBlock');
  }, [mainPlacementFields]);

  const shouldRenderMain = isSplit && !!(hasStaticMainContent || hasVisibleConditionedMainBlock);

  // Layout-based styles
  const isDualCardLayout = isSplit && shouldRenderMain;

  const handleSubmit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (isLastStep) {
      void formMethods.handleSubmit(submit)(event);
    } else {
      void next();
    }
  };

  if (!config._localized_status.published) return <></>;

  return (
    <div className="@container w-full">
      <div
        className={cn(
          'relative w-full',
          isDualCardLayout ? 'max-w-2xl @[1600px]:max-w-full' : 'max-w-2xl',
          'min-h-[100px] bg-transparent p-0 shadow-none',
        )}
      >
        {/* ... existing error and preview logic ... */}
        {status === 'error' && (
          <div className="mb-4 rounded border border-red-400 bg-red-100 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {Boolean(previewData) && (
          <div className="mb-4 rounded border border-gray-400 bg-gray-100 p-4">
            Preview Data: <pre>{JSON.stringify(previewData, undefined, 2)}</pre>
          </div>
        )}

        {/* Success Message / Confirmation */}
        {status === 'success' && config.confirmationType === 'message' ? (
          <SubmissionMessage
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            content={confirmationMessage}
            onReset={handleReset}
            locale={locale}
          />
        ) : (
          <JobSelectionProvider>
            <FormProvider {...formMethods}>
              <form id={config.id} onSubmit={handleSubmit} noValidate>
                <div
                  className={cn(
                    '',
                    isDualCardLayout
                      ? 'grid grid-cols-1 items-start gap-8 @[1600px]:grid-cols-[36rem_1fr] @[1600px]:gap-12'
                      : 'flex flex-col gap-6',
                  )}
                >
                  <aside
                    className={cn(
                      'w-full',
                      (isDualCardLayout || withBorder) &&
                        'space-y-6 rounded-xl border border-gray-100 bg-white p-8 shadow-sm',
                    )}
                  >
                    {steps.length > 1 && currentActualStep && (
                      <ProgressBar
                        locale={locale}
                        currentStepIndex={currentStepIndex}
                        definedSteps={steps}
                        currentActualStep={currentActualStep}
                      />
                    )}
                    {currentActualStep && (
                      <FormFieldRenderer
                        section={currentActualStep}
                        currentStepIndex={currentStepIndex}
                        formId={config.id}
                        renderMode={isDualCardLayout ? 'sidebar' : 'all'}
                      />
                    )}
                    <div className="pt-4">
                      <FormControls
                        locale={locale}
                        isFirst={isFirstStep}
                        isLast={isLastStep}
                        isSubmitting={status === 'loading'}
                        // eslint-disable-next-line @typescript-eslint/no-misused-promises
                        onNext={next}
                        onPrev={prev}
                        submitLabel={config.submitButtonLabel ?? ''}
                        formId={config.id}
                      />
                    </div>
                  </aside>

                  {isDualCardLayout && (
                    <div
                      key="main-column"
                      className="animate-in fade-in fill-mode-backwards rounded-xl border border-gray-100 bg-white p-8 shadow-sm duration-300"
                    >
                      <div className={status === 'loading' ? 'pointer-events-none opacity-50' : ''}>
                        <FormFieldRenderer
                          section={currentActualStep}
                          currentStepIndex={currentStepIndex}
                          formId={config.id}
                          renderMode="main"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </FormProvider>
          </JobSelectionProvider>
        )}
      </div>
    </div>
  );
};
