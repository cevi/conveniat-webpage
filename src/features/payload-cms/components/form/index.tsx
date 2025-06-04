'use client';

import { buildInitialFormState } from '@/features/payload-cms/components/form/build-initial-form-state';
import { fields } from '@/features/payload-cms/components/form/fields';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { FormFieldBlock, Form as FormType } from '@payloadcms/plugin-form-builder/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { RichText } from '@payloadcms/richtext-lexical/react';
import { useCurrentLocale } from 'next-i18n-router/client';
import { useRouter } from 'next/navigation';
import type { MouseEventHandler } from 'react';
import React, { useState } from 'react';
import type { FieldName } from 'react-hook-form';
import { useForm } from 'react-hook-form';

export type Value = unknown;

export interface Property {
  [key: string]: Value;
}

export interface Data {
  [key: string]: Property | Property[] | Value;
}

const resetFormText: StaticTranslationString = {
  en: 'Reset Form',
  de: 'Formular zurücksetzen',
  fr: 'Réinitialiser le formulaire',
};

const pleaseWaitText: StaticTranslationString = {
  en: 'Loading, please wait...',
  de: 'Laden, bitte warten...',
  fr: 'Chargement, veuillez patienter',
};

const nextStepText: StaticTranslationString = {
  en: 'Next',
  de: 'Weiter',
  fr: 'Suivant',
};

const previousStepText: StaticTranslationString = {
  en: 'Previous',
  de: 'Zurück',
  fr: 'Précédent',
};

const validationErrorText: StaticTranslationString = {
  en: 'Please fill out all required fields',
  de: 'Bitte füllen Sie alle erforderlichen Felder aus',
  fr: 'Veuillez remplir tous les champs obligatoires',
};

const allGoodPreviewText: StaticTranslationString = {
  en: 'All good - but this is just a preview.',
  de: 'Alles gut - aber das ist nur eine Vorschau.',
  fr: "Tout va bien - mais ceci n'est qu'un aperçu.",
};

const failedToSubmitText: StaticTranslationString = {
  en: 'Failed to submit form. Please try again later.',
  de: 'Formularübermittlung fehlgeschlagen. Bitte versuchen Sie es später erneut.',
  fr: "Échec de l'envoi du formulaire. Veuillez réessayer plus tard.",
};

const pageNaviationErrorText: StaticTranslationString = {
  en: 'An error occurred while navigating to the next step.',
  de: 'Ein Fehler ist beim Navigieren zum nächsten Schritt aufgetreten.',
  fr: "Une erreur s'est produite lors de la navigation vers l'étape suivante.",
};

const stepText: StaticTranslationString = {
  en: 'Step',
  de: 'Schritt',
  fr: 'Étape',
};

const ofText: StaticTranslationString = {
  en: 'of',
  de: 'von',
  fr: 'de',
};

interface ConditionedBlock {
  blockType: 'conditionedBlock';
  id?: string;
  displayCondition: {
    field: string; // The name of the field to check
    value: string; // The value to match
  };
  fields: FormFieldBlock[];
}

interface FormSection {
  id: string;
  sectionTitle: string;
  fields: (FormFieldBlock | ConditionedBlock)[];
}

export interface FormBlockType {
  blockName?: string;
  blockType?: 'formBlock';
  form: FormType & {
    autocomplete: boolean;
    sections: {
      id: string;
      formSection: FormSection;
    }[];
    _localized_status: { published: boolean };
  };
}

interface FormFieldRendererProperties {
  section: FormSection;
  form: FormType & { _localized_status: { published: boolean } };
  formMethods: ReturnType<typeof useForm>;
}

const FormFieldRenderer: React.FC<FormFieldRendererProperties> = ({
  section,
  form,
  formMethods,
}) => {
  const {
    control,
    register,
    formState: { errors },
    watch,
  } = formMethods;

  return (
    <>
      <h3 className="text-md text-conveniat-green mb-3 font-['Montserrat'] font-bold">
        {'sectionTitle' in section ? section.sectionTitle : ''}
      </h3>

      {section.fields.map((fieldChild, indexChild) => {
        // render conditioned blocks
        if (fieldChild.blockType == 'conditionedBlock') {
          // If the field is a conditioned block, we need to render it conditionally
          const { field: conditionField, value: targetValue } = fieldChild.displayCondition;

          // Get the condition function from the form methods
          // we need to convert to string as checkbox values are boolean,
          // but the targetValue is always a string
          const watchValue = watch(conditionField, '') as string | boolean | number | undefined;
          const condition = (watchValue ?? '').toString() === targetValue;

          if (!condition) {
            // If the condition is not met, we skip rendering this block
            return (
              <React.Fragment
                key={`conditioned-${fieldChild.blockType}-${indexChild}`}
              ></React.Fragment>
            );
          }

          const fieldID =
            'id' in fieldChild && Boolean(fieldChild.id)
              ? (fieldChild.id as string)
              : `conditioned-${fieldChild.blockType}-${indexChild}`;

          // If the condition is met, we render the conditioned block
          return (
            <React.Fragment key={fieldID}>
              <FormFieldRenderer
                section={{ id: fieldID, sectionTitle: '', fields: fieldChild.fields }}
                form={form}
                formMethods={formMethods}
              />
            </React.Fragment>
          );
        }

        const FieldChildComponent = fields[fieldChild.blockType as keyof typeof fields];
        if (!FieldChildComponent) {
          console.error(`Field type ${fieldChild.blockType} is not supported`);
          return <React.Fragment key={`unsupported-${indexChild}`}></React.Fragment>;
        }

        // Extract the required property from the field
        const isRequired = 'required' in fieldChild ? Boolean(fieldChild.required) : false;

        return (
          <React.Fragment
            key={
              'id' in fieldChild && Boolean(fieldChild.id)
                ? (fieldChild.id as string)
                : `field-${fieldChild.blockType}-${indexChild}`
            }
          >
            <FieldChildComponent
              form={form}
              {...fieldChild}
              {...formMethods}
              control={control}
              registerAction={register}
              errors={errors}
              required={isRequired}
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

const NextPageButton: React.FC<{
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled: boolean;
  locale: string | undefined;
}> = ({ onClick, disabled, locale }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-full cursor-pointer rounded-lg bg-[#47564c] px-5 py-2 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] disabled:opacity-50 sm:w-auto"
    >
      {nextStepText[locale as Locale]}
    </button>
  );
};

const SubmitButton: React.FC<{
  disabled: boolean;
  form: string | undefined;
  locale: string | undefined;
  submitButtonLabel: string;
}> = ({ disabled, form, locale, submitButtonLabel }) => {
  return (
    <button
      type="submit"
      disabled={disabled}
      form={form}
      className="h-10 w-full cursor-pointer rounded-lg bg-[#47564c] px-5 py-2 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] disabled:opacity-50 sm:w-auto"
    >
      {disabled ? pleaseWaitText[locale as Locale] : submitButtonLabel}
    </button>
  );
};

const PreviousPageButton: React.FC<{
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  disabled: boolean;
  locale: string | undefined;
}> = ({ onClick, disabled, locale }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-full cursor-pointer rounded-lg bg-gray-300 px-5 py-2 font-['Montserrat'] text-base font-semibold text-gray-700 transition duration-300 hover:bg-gray-400 disabled:opacity-50 sm:w-auto"
    >
      {previousStepText[locale as Locale]}
    </button>
  );
};

const ProgressBar: React.FC<{
  locale: string | undefined;
  currentStepIndex: number;
  definedSteps: FormSection[];
  currentActualStep: FormSection;
}> = ({ locale, currentStepIndex, definedSteps, currentActualStep }) => {
  return (
    <div className="mb-6">
      <div className="text-conveniat-green mb-2 flex justify-between text-sm font-medium">
        <span>
          {stepText[locale as Locale]} {currentStepIndex + 1} {ofText[locale as Locale]}{' '}
          {definedSteps.length}
        </span>
        <span>{Math.round(((currentStepIndex + 1) / definedSteps.length) * 100)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-[#47564c] transition-all duration-300 ease-in-out"
          style={{
            width: `${((currentStepIndex + 1) / definedSteps.length) * 100}%`,
          }}
        />
      </div>
      <div className="mt-2 text-xs text-gray-600">
        {'sectionTitle' in currentActualStep && currentActualStep.sectionTitle}
      </div>
    </div>
  );
};

const ResetFormButton: React.FC<{
  onClick: () => void;
  locale: string | undefined;
}> = ({ onClick, locale }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 h-10 w-full rounded-lg bg-[#47564c] px-4 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] sm:w-auto"
    >
      {resetFormText[locale as Locale]}
    </button>
  );
};

export const FormBlock: React.FC<
  FormBlockType & { id?: string; isPreviewMode?: boolean | undefined }
  // eslint-disable-next-line complexity
> = (properties) => {
  const {
    isPreviewMode,
    form: formFromProperties,
    form: {
      id: formID,
      title: mainFormTitle,
      confirmationMessage,
      confirmationType,
      redirect,
      submitButtonLabel,
    } = {},
  } = properties;

  const locale = useCurrentLocale(i18nConfig);
  const formMethods = useForm({
    defaultValues: buildInitialFormState(
      formFromProperties.sections.flatMap(
        (section) => section.formSection.fields,
      ) as FormFieldBlock[],
    ),
    mode: 'onChange',
    reValidateMode: 'onBlur',
  });

  const {
    handleSubmit,
    trigger,
    formState: { isSubmitting },
  } = formMethods;

  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; status?: string } | undefined>();
  const [validationError, setValidationError] = useState<string | undefined>();
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const definedSteps = formFromProperties.sections.flatMap((section) => section.formSection);
  const currentActualStep = definedSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === definedSteps.length - 1;

  // Get all field names for the current step
  const getCurrentStepFieldNames = (): FieldName<Data>[] => {
    let formFields: FormFieldBlock[] = [];
    if (currentActualStep === undefined) formFields = [];
    else if ('fields' in currentActualStep)
      formFields = currentActualStep.fields as FormFieldBlock[];

    return formFields
      .map((field) => ('name' in field && field.name !== '' ? field.name : ''))
      .filter(Boolean) as FieldName<Data>[];
  };

  const handleFinalFormSubmit = (data: Data): void => {
    let loadingTimerID: ReturnType<typeof setTimeout>;
    // eslint-disable-next-line complexity
    const submitForm = async (): Promise<void> => {
      setError(undefined);
      setValidationError(undefined);

      // Validate all fields before submission
      const isValid = await trigger();
      if (!isValid) {
        setValidationError(validationErrorText[locale as Locale]);
        return;
      }

      const dataToSend = Object.entries(data).map(([name, value]) => ({
        field: name,
        value,
      }));
      loadingTimerID = setTimeout(() => {
        setIsLoading(true);
      }, 1000);

      if (isPreviewMode ?? false) {
        clearTimeout(loadingTimerID);
        setIsLoading(false);
        setHasSubmitted(true);
        setError({
          message: allGoodPreviewText[locale as Locale],
          status: String(200),
        });
        return;
      }

      // convert multi-select values to comma-separated strings
      for (const [index, fieldData] of Object.entries(dataToSend)) {
        if (Array.isArray(fieldData.value)) {
          dataToSend[index as unknown as number] = {
            ...fieldData,
            value: fieldData.value.join(', '),
          };
        }
      }

      try {
        const request = await fetch(`/api/form-submissions`, {
          body: JSON.stringify({
            form: formID,
            submissionData: dataToSend,
          }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });

        if (!request.ok) {
          setError({
            message: failedToSubmitText[locale as Locale],
            status: String(request.status),
          });
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const responseData = await request.json();
        clearTimeout(loadingTimerID);
        setIsLoading(false);
        if (request.status >= 400) {
          setError({
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            message:
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              responseData.errors?.[0]?.message ?? responseData.message ?? 'Internal Server Error',
            status: String(request.status),
          });
          return;
        }
        setHasSubmitted(true);
        if (confirmationType === 'redirect' && redirect) {
          const { url } = redirect;
          if (url !== '') router.push(url);
        }
      } catch (error_) {
        console.warn('Submission error:', error_);
        clearTimeout(loadingTimerID);
        setIsLoading(false);
        setError({ message: error_ instanceof Error ? error_.message : 'Something went wrong.' });
      }
    };
    void submitForm();
  };

  const goToNextStep = async (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ): Promise<void> => {
    event.preventDefault(); // prevent form from submitting
    setValidationError(undefined);

    const fieldNamesInCurrentStep = getCurrentStepFieldNames();

    if (fieldNamesInCurrentStep.length > 0) {
      // Explicitly trigger validation for all fields in the current step
      const isValid = await trigger(fieldNamesInCurrentStep, { shouldFocus: true });

      if (!isValid) {
        setValidationError(validationErrorText[locale as Locale]);
        return;
      }
    }

    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const goToNextStepHandler: MouseEventHandler<HTMLButtonElement> = (event): void => {
    goToNextStep(event).catch((error_: unknown): void => {
      console.warn('Error while going to next step:', error_);
      setError({
        message: pageNaviationErrorText[locale as Locale],
        status: '500',
      });
    });
  };

  const goToPreviousStep: MouseEventHandler<HTMLButtonElement> = (event): void => {
    event.preventDefault(); // prevent form from submitting
    setValidationError(undefined);

    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  if (!formFromProperties._localized_status.published) {
    return <></>;
  }
  if (definedSteps.length === 0 || currentActualStep === undefined) {
    return <div>Form configuration error or no fields to display.</div>;
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md border border-red-400 bg-red-100 p-4 text-red-700">{`Error ${error.status ?? ''}: ${error.message}`}</div>
      )}
      <form
        className="relative mx-auto h-auto max-w-xl rounded-md border-2 border-gray-200 bg-white p-6"
        id={formID}
        onSubmit={(event?: React.BaseSyntheticEvent): void => {
          event?.preventDefault();
          if (isLastStep) {
            handleSubmit(handleFinalFormSubmit)(event).catch((error_: unknown) => {
              console.warn('Form submission validation error:', error_);
            });
          }
        }}
        noValidate
        autoComplete={formFromProperties.autocomplete ? 'on' : 'off'}
        aria-autocomplete={formFromProperties.autocomplete ? 'none' : 'list'}
      >
        {formFromProperties.autocomplete && (
          <input autoComplete="false" name="hidden" type="text" className="hidden"></input>
        )}
        {!isLoading && hasSubmitted && confirmationType === 'message' && (
          <div className="bg-opacity-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-6 text-center">
            <div className="max-w-md">
              <RichText data={confirmationMessage as SerializedEditorState} />
              <ResetFormButton
                onClick={() => {
                  setHasSubmitted(false);
                  formMethods.reset();
                  setCurrentStepIndex(0);
                  setValidationError(undefined);
                }}
                locale={locale}
              />
            </div>
          </div>
        )}

        {isLoading && (
          <div className="bg-opacity-95 absolute inset-0 z-10 flex items-center justify-center bg-white p-6 text-center">
            <p>{pleaseWaitText[locale as Locale]}</p>
          </div>
        )}

        {mainFormTitle !== undefined && (
          <h2 className="text-conveniat-green mb-4 font-['Montserrat'] text-lg font-extrabold">
            {mainFormTitle}
          </h2>
        )}

        {/* Validation error message */}
        {validationError != undefined && (
          <div className="mb-4 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-700">
            {validationError}
          </div>
        )}

        {definedSteps.length > 1 && (
          <ProgressBar
            locale={locale}
            currentStepIndex={currentStepIndex}
            definedSteps={definedSteps}
            currentActualStep={currentActualStep as FormSection}
          />
        )}

        <div
          className={
            isLoading || (hasSubmitted && confirmationType === 'message')
              ? 'opacity-0'
              : 'opacity-100 transition-opacity duration-300'
          }
        >
          <React.Fragment key={formID}>
            <FormFieldRenderer
              section={currentActualStep}
              form={formFromProperties}
              formMethods={formMethods}
            />
          </React.Fragment>

          {definedSteps.length === 1 && !isLoading && !hasSubmitted ? (
            <button
              type="submit"
              disabled={isSubmitting}
              form={formID}
              className="mt-6 h-10 w-full cursor-pointer rounded-lg bg-[#47564c] font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] disabled:opacity-50"
            >
              {isSubmitting ? pleaseWaitText[locale as Locale] : submitButtonLabel}
            </button>
          ) : (
            definedSteps.length > 1 &&
            !isLoading &&
            !hasSubmitted && (
              <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                {isFirstStep ? (
                  <span className="hidden sm:block sm:w-1/3" />
                ) : (
                  <PreviousPageButton
                    onClick={goToPreviousStep}
                    disabled={isSubmitting}
                    locale={locale}
                  />
                )}

                {isLastStep ? (
                  <SubmitButton
                    disabled={isSubmitting}
                    form={formID}
                    locale={locale}
                    submitButtonLabel={submitButtonLabel as string}
                  />
                ) : (
                  <NextPageButton
                    onClick={goToNextStepHandler}
                    disabled={isSubmitting}
                    locale={locale}
                  />
                )}
              </div>
            )
          )}
        </div>
      </form>
    </div>
  );
};
