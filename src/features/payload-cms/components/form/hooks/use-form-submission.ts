import type { ExtendedFormType } from '@/features/payload-cms/components/form/types';
import { type Locale, type StaticTranslationString } from '@/types/types';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface UseFormSubmissionProperties {
  formId: string;
  config: ExtendedFormType;
  isPreviewMode?: boolean;
  locale: Locale;
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

export const useFormSubmission = ({
  formId,
  config,
  isPreviewMode,
  locale,
}: UseFormSubmissionProperties): UseFormSubmissionReturn => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [previewData, setPreviewData] = useState<PreviewData | undefined>();
  const router = useRouter();

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
    try {
      const resp = await fetch(`/api/form-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form: formId, submissionData: dataToSend }),
      });

      if (!resp.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const errorData = await resp.json();
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (errorData.errors?.[0]?.message as string | undefined) ||
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (errorData.message as string | undefined) ||
            failedToSubmitText[locale],
        );
      }

      await resp.json();
      setStatus('success');

      // Clear session storage on success
      if (typeof formId === 'string' && formId !== '') {
        sessionStorage.removeItem(`form-state-${formId}`);
        sessionStorage.removeItem(`form_step_${formId}`);
      }

      if (config.confirmationType === 'redirect' && config.redirect?.url) {
        router.push(config.redirect.url);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setStatus('error');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      setErrorMessage((error.message as string) || 'Submission failed');
    }
  };

  const reset = (): void => {
    setStatus('idle');
    setErrorMessage(undefined);
    setPreviewData(undefined);
    // Clear session storage on reset
    if (typeof formId === 'string' && formId !== '') {
      sessionStorage.removeItem(`form-state-${formId}`);
      sessionStorage.removeItem(`form_step_${formId}`);
    }
  };

  return { status, errorMessage, previewData, submit, reset };
};
