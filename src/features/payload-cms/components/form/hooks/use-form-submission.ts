import {
  fieldIsNotValidText,
  fieldIsRequiredText,
  invalidDateText,
  invalidEmailText,
  invalidNumberText,
  invalidSelectionText,
} from '@/features/payload-cms/components/form/static-form-texts';
import type { ExtendedFormType, FormSection } from '@/features/payload-cms/components/form/types';
import { getFormStorageKey } from '@/features/payload-cms/components/form/utils/get-form-storage-key';
import { formErrorTexts } from '@/features/payload-cms/form-error-texts';
import { usePostHog } from '@/providers/posthog-context';
import { type Locale, type StaticTranslationString } from '@/types/types';
import { noConnectionTranslation } from '@/utils/shared-translations';
import { type ErrorParameters, formatErrorText } from '@/utils/user-error-message';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FieldValues, UseFormSetError } from 'react-hook-form';

interface UseFormSubmissionProperties {
  formId: string;
  config: ExtendedFormType;
  isPreviewMode?: boolean;
  locale: Locale;
  setError?: UseFormSetError<FieldValues>;
  formSections?: FormSection[];
  setCurrentStepIndex?: (index: number) => void;
  /** Called once the submission is stored, instead of a redirect. */
  onSubmitted?: (() => void) | undefined;
}

interface PreviewData {
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
}

interface SubmissionField {
  field: string;
  value: unknown;
}

interface UseFormSubmissionReturn {
  status: 'idle' | 'loading' | 'success' | 'error';
  errorMessage: string | undefined;
  previewData: PreviewData | undefined; // Change null to undefined
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submit: (data: Record<string, any>) => Promise<void>;
  reset: () => void;
}

const allGoodPreviewText: StaticTranslationString = {
  en: 'All good – but this is just a preview. No data has been submitted. The following data would be submitted:',
  de: 'Alles gut - aber das ist nur eine Vorschau. Keine Daten wurden übermittelt. Folgende Daten würden übermittelt werden:',
  fr: "Tout va bien – mais ceci n'est qu'un aperçu. Aucune donnée n'a été transmise. Les données suivantes seraient transmises :",
};

const failedToSubmitText: StaticTranslationString = {
  en: 'Failed to submit form. Please try again later.',
  de: 'Formularübermittlung fehlgeschlagen. Bitte versuchen Sie es später erneut.',
  fr: "Échec de l'envoi du formulaire. Veuillez réessayer plus tard.",
};

const correctHighlightedErrorsText: StaticTranslationString = {
  en: 'Please correct the highlighted errors.',
  de: 'Bitte korrigieren Sie die markierten Fehler.',
  fr: 'Veuillez corriger les erreurs mises en évidence.',
};

/** A refusal a form hook named a reason for, in the language of the page. */
class SubmissionRefusedError extends Error {
  constructor(template: string, params: ErrorParameters) {
    super(formatErrorText(template, params));
  }
}

/** The reason and params of a hook's refusal, when its texts know the reason. */
const refusalReasonOf = (
  data: unknown,
): { text: StaticTranslationString; params: ErrorParameters } | undefined => {
  if (typeof data !== 'object' || data === null || !('reason' in data)) return undefined;
  const texts: Record<string, StaticTranslationString | undefined> = formErrorTexts;
  const text = typeof data.reason === 'string' ? texts[data.reason] : undefined;
  if (text === undefined) return undefined;
  const params = 'params' in data && typeof data.params === 'object' ? data.params : undefined;
  return { text, params: (params ?? {}) as ErrorParameters };
};

export const useFormSubmission = ({
  formId,
  config,
  isPreviewMode,
  locale,
  setError,
  formSections,
  setCurrentStepIndex,
  onSubmitted,
}: UseFormSubmissionProperties): UseFormSubmissionReturn => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [previewData, setPreviewData] = useState<PreviewData | undefined>();
  const router = useRouter();
  const posthog = usePostHog();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submit = async (data: Record<string, any>): Promise<void> => {
    setStatus('loading');
    setErrorMessage(undefined);

    // 1. Format Data (Comma separated arrays)
    // Map initial data to array of objects
    const initialData: SubmissionField[] = Object.entries(data).map(([name, value]) => ({
      field: name,
      value: value as unknown,
    }));

    // Clone to mutable array for processing
    let dataToSend: SubmissionField[] = [...initialData];

    // convert multi-select values to comma-separated strings

    for (let index = 0; index < dataToSend.length; index++) {
      const fieldData = dataToSend[index];
      if (!fieldData) continue;

      if (Array.isArray(fieldData.value)) {
        dataToSend[index] = {
          ...fieldData,
          value: fieldData.value.map(String).join(', '),
        };
      }
    }

    // remove all fields that have no value (but keep empty strings if intentionally set)
    dataToSend = dataToSend.filter((fieldData) => fieldData.value !== undefined);

    // 2. Handle Preview
    if (isPreviewMode === true) {
      // Simulate delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setStatus('success');
      setPreviewData({
        message: allGoodPreviewText[locale],
        data: dataToSend,
      });
      return;
    }

    // 3. API Call
    let resp: Response;
    try {
      resp = await fetch(`/api/form-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: formId, submissionData: dataToSend }),
      });
    } catch (error: unknown) {
      // the request never reached the server; the browser's own message is English and differs
      // per browser ("Failed to fetch", "Load failed")
      setStatus('error');
      setErrorMessage(noConnectionTranslation[locale]);
      posthog?.capture('form_submission_error', {
        error_type: 'network',
        form_id: formId,
        error_message: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    try {
      if (!resp.ok) {
        // a proxy or the service worker can answer with an HTML page instead of Payload's JSON
        const errorData = (await resp.json().catch(() => ({}))) as {
          errors?: { data?: unknown; message?: string }[];
          message?: string;
        };
        const refusal = errorData.errors?.[0]?.data;

        // Handle field-level validation errors from payload
        if (Array.isArray(refusal)) {
          const fieldErrors = refusal as { field: string; message: string }[];
          if (setError) {
            const capturedErrors: string[] = [];
            for (const error of fieldErrors) {
              let message = error.message;
              switch (message) {
                case 'required': {
                  message = fieldIsRequiredText[locale];
                  break;
                }
                case 'invalid_email': {
                  message = invalidEmailText[locale];
                  break;
                }
                case 'invalid_number': {
                  message = invalidNumberText[locale];
                  break;
                }
                case 'invalid_date': {
                  message = invalidDateText[locale];
                  break;
                }
                case 'invalid_format': {
                  message = fieldIsNotValidText[locale];
                  break;
                }
                case 'invalid_selection': {
                  message = invalidSelectionText[locale];
                  break;
                }
              }
              capturedErrors.push(`${error.field}: ${error.message}`);
              setError(error.field, { type: 'server', message });
            }

            posthog?.capture('form_validation_failed', {
              form_id: formId,
              error_message: capturedErrors.join(', '),
              source: 'server',
            });

            // Navigate to the step containing the first errored field
            if (formSections && setCurrentStepIndex && fieldErrors.length > 0) {
              const firstError = fieldErrors[0];
              if (firstError) {
                const firstErrorField = firstError.field;
                const stepIndex = formSections.findIndex((section) =>
                  section.fields.some((f) => {
                    if ('name' in f && f.name === firstErrorField) return true;
                    if (f.blockType === 'conditionedBlock') {
                      return f.fields.some((sub) => 'name' in sub && sub.name === firstErrorField);
                    }
                    return false;
                  }),
                );
                if (stepIndex !== -1) {
                  setCurrentStepIndex(stepIndex);
                }
              }
            }

            throw new Error(correctHighlightedErrorsText[locale]);
          }
        }

        // A form hook names why it refused, see `formErrorTexts`. Anything else is Payload's or a
        // proxy's English, kept for the analytics event only.
        const reason = refusalReasonOf(refusal);
        if (reason !== undefined)
          throw new SubmissionRefusedError(reason.text[locale], reason.params);
        throw new Error(
          errorData.errors?.[0]?.message ?? errorData.message ?? `HTTP ${resp.status}`,
        );
      }

      await resp.json();
      setStatus('success');

      // Clear session storage on success
      if (typeof formId === 'string' && formId !== '') {
        sessionStorage.removeItem(getFormStorageKey(formId, 'state'));
        sessionStorage.removeItem(getFormStorageKey(formId, 'step'));
      }

      if (onSubmitted !== undefined) {
        onSubmitted();
      } else if (
        config.confirmationType === 'redirect' &&
        typeof config.redirect?.url === 'string' &&
        config.redirect.url.length > 0
      ) {
        router.push(config.redirect.url);
      }
    } catch (error: unknown) {
      setStatus('error');
      const message =
        error instanceof Error && error.message.length > 0 ? error.message : String(error);

      const isFieldValidationError = Object.values(correctHighlightedErrorsText).includes(message);

      if (isFieldValidationError) {
        // Validation errors are already captured prior to throwing this error
        setErrorMessage(message);
      } else if (message.includes('initializing Payload')) {
        posthog?.capture('form_submission_error', {
          error_type: 'payload_initialization',
          form_id: formId,
          original_message: message,
        });
        setErrorMessage(failedToSubmitText[locale]);
      } else {
        posthog?.capture('form_submission_error', {
          error_type: 'submission_failed',
          form_id: formId,
          error_message: message,
        });
        setErrorMessage(
          error instanceof SubmissionRefusedError ? message : failedToSubmitText[locale],
        );
      }
    }
  };

  const reset = (): void => {
    setStatus('idle');
    setErrorMessage(undefined);
    setPreviewData(undefined);
    // Clear session storage on reset
    if (typeof formId === 'string' && formId !== '') {
      sessionStorage.removeItem(getFormStorageKey(formId, 'state'));
      sessionStorage.removeItem(getFormStorageKey(formId, 'step'));
    }
  };

  return { status, errorMessage, previewData, submit, reset };
};
