'use client';

import type { Locale } from '@/types/types'; // Import Locale
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import { useCurrentLocale } from 'next-i18n-router/client';
import React, { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

// Custom Hooks & Components
import { FormControls } from '@/features/payload-cms/components/form/components/form-controls';
import { FormFieldRenderer } from '@/features/payload-cms/components/form/components/form-field-renderer';
import { ProgressBar } from '@/features/payload-cms/components/form/components/progress-bar';
import { SubmissionMessage } from '@/features/payload-cms/components/form/components/submission-message';
import { useFormSteps } from '@/features/payload-cms/components/form/hooks/use-form-steps';
import { useFormSubmission } from '@/features/payload-cms/components/form/hooks/use-form-submission';
import { JobSelectionProvider } from '@/features/payload-cms/components/form/job-selection';
import type { FormBlockType } from '@/features/payload-cms/components/form/types';
export type { FormBlockType } from '@/features/payload-cms/components/form/types';

export const FormBlock: React.FC<
  FormBlockType & { isPreviewMode?: boolean; withBorder?: boolean }
> = ({ form: config, isPreviewMode, withBorder = true }) => {
  const currentLocale = useCurrentLocale(i18nConfig);
  const locale = (currentLocale ?? 'en') as Locale;

  // 1. Initialize Form
  const formMethods = useForm({
    mode: 'onChange',
    defaultValues: {},
  });

  // Restore form state from sessionStorage on mount
  useEffect(() => {
    if (typeof config.id === 'string' && config.id.length > 0) {
      const savedState = sessionStorage.getItem(`form-state-${config.id}`);
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
    formMethods.reset({});
    setCurrentStepIndex(0);
  };

  if (!config._localized_status.published) return <></>;

  // 3. Render
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const confirmationMessage = config.confirmationMessage;

  const handleSubmit = (event: React.FormEvent): void => {
    void formMethods.handleSubmit(submit)(event);
  };

  const isSplit = currentActualStep?.layout === 'split';

  return (
    <div
      className={cn(
        'relative mx-auto transition-all duration-300',
        isSplit ? 'max-w-screen-2xl' : 'max-w-xl',
        withBorder ? 'rounded-md border-2 border-gray-200 bg-white p-6' : '',
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
                className={cn(isSplit ? 'grid grid-cols-1 gap-8 min-[1440px]:grid-cols-12' : '')}
              >
                <aside className={cn(isSplit ? 'space-y-6 min-[1440px]:col-span-5' : 'contents')}>
                  {steps.length > 1 && currentActualStep && (
                    <ProgressBar
                      locale={locale}
                      currentStepIndex={currentStepIndex}
                      definedSteps={steps}
                      currentActualStep={currentActualStep}
                    />
                  )}
                  {isSplit && (
                    <FormFieldRenderer
                      section={currentActualStep}
                      currentStepIndex={currentStepIndex}
                      formId={config.id}
                      renderMode="sidebar"
                    />
                  )}
                </aside>

                <main
                  className={cn(
                    isSplit ? 'min-[1440px]:col-span-7 min-[1440px]:mt-[140px]' : 'contents',
                  )}
                >
                  <div className={status === 'loading' ? 'pointer-events-none opacity-50' : ''}>
                    {currentActualStep && (
                      <FormFieldRenderer
                        section={currentActualStep}
                        currentStepIndex={currentStepIndex}
                        formId={config.id}
                        renderMode={isSplit ? 'main' : 'all'}
                      />
                    )}
                  </div>

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
                </main>
              </div>
            </form>
          </FormProvider>
        </JobSelectionProvider>
      )}
    </div>
  );
};
