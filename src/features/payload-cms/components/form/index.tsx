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
import React, { useMemo, useState } from 'react';
import type { FieldName } from 'react-hook-form';
import { useForm } from 'react-hook-form';

export type Value = unknown;

export interface Property {
  [key: string]: Value;
}

export interface FormBlockType {
  blockName?: string;
  blockType?: 'formBlock';
  form: FormType & {
    _localized_status: { published: boolean };
  };
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

interface FormPageBlock {
  id: string;
  blockType: 'formPage';
  pageTitle: string;
  fields: FormFieldBlock[];
}

type FormPageBlockType = FormFieldBlock | FormPageBlock;

interface FormFieldRendererProperties {
  field: FormPageBlockType;
  form: FormType & { _localized_status: { published: boolean } };
  formMethods: ReturnType<typeof useForm>;
}

const FormFieldRenderer: React.FC<FormFieldRendererProperties> = ({ field, form, formMethods }) => {
  const { control, register } = formMethods;

  return (
    <>
      <h3 className="text-md mb-3 font-['Montserrat'] font-bold text-[#47564c]">
        {'pageTitle' in field ? field.pageTitle : ''}
      </h3>

      {'fields' in field &&
        field.fields.map((fieldChild, indexChild) => {
          const FieldChildComponent = fields[fieldChild.blockType as keyof typeof fields];
          if (!FieldChildComponent) {
            console.error(`Field type ${fieldChild.blockType} is not supported`);
            return <React.Fragment key={`unsupported-${indexChild}`}></React.Fragment>;
          }
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
              />
            </React.Fragment>
          );
        })}
    </>
  );
};

// eslint-disable-next-line complexity
export const FormBlock: React.FC<FormBlockType & { id?: string }> = (properties) => {
  const {
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
    defaultValues: buildInitialFormState(formFromProperties.fields as FormFieldBlock[]),
    resolver: async (data) => {
      return {
        values: data,
        errors: {},
      };
    },
    mode: 'onChange',
  });

  const { handleSubmit, trigger } = formMethods;
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>(false);
  const [error, setError] = useState<{ message: string; status?: string } | undefined>();
  const router = useRouter();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const definedSteps = useMemo((): FormPageBlockType[] => {
    const allFieldsInForm = formFromProperties.fields as (FormFieldBlock & {
      name?: string;
    })[];

    const formPageFields = allFieldsInForm.filter(
      (field: FormPageBlockType) => field.blockType === 'formPage',
    );

    if (formPageFields.length > 0) {
      return formPageFields.map((page) => ({
        ...page,
      }));
    }
    return [
      {
        id: 'mainFormAsSinglePage-0',
        blockType: 'formPage' as const,
        pageTitle: mainFormTitle ?? '',
        fields: allFieldsInForm,
      },
    ];
  }, [formFromProperties.fields, mainFormTitle]);

  const currentActualStep = definedSteps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === definedSteps.length - 1;

  const handleFinalFormSubmit = (data: Data): void => {
    let loadingTimerID: ReturnType<typeof setTimeout>;
    // eslint-disable-next-line complexity
    const submitForm = async (): Promise<void> => {
      setError(undefined);
      const dataToSend = Object.entries(data).map(([name, value]) => ({
        field: name,
        value,
      }));
      loadingTimerID = setTimeout(() => {
        setIsLoading(true);
      }, 1000);

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
            message: 'Failed to submit form. Please try again later.',
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
    let formFields: FormFieldBlock[] = [];
    if (currentActualStep === undefined) formFields = [];
    else if ('fields' in currentActualStep) formFields = currentActualStep.fields;

    const fieldNamesInCurrentStep = formFields
      .map((field) => ('name' in field && field.name ? field.name : ''))
      .filter(Boolean) as FieldName<Data>[];

    if (fieldNamesInCurrentStep.length > 0) {
      const isValid = await trigger(fieldNamesInCurrentStep);
      if (!isValid) return;
    }

    if (!isLastStep) {
      setCurrentStepIndex(currentStepIndex + 1);
    }

    event.preventDefault(); // prevent form from submitting
  };

  const goToNextStepHandler: MouseEventHandler<HTMLButtonElement> = (event): void => {
    goToNextStep(event).catch((error_: unknown): void => {
      console.warn('Error while going to next step:', error_);
      setError({
        message: 'An error occurred while navigating to the next step.',
        status: '500',
      });
    });
  };

  const goToPreviousStep: MouseEventHandler<HTMLButtonElement> = (event): void => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1);
    }

    event.preventDefault(); // prevent form from submitting
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
      >
        {!isLoading && hasSubmitted && confirmationType === 'message' && (
          <div className="bg-opacity-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-6 text-center">
            <div className="max-w-md">
              <RichText data={confirmationMessage as SerializedEditorState} />
              <button
                type="button"
                onClick={() => {
                  setHasSubmitted(false);
                  formMethods.reset();
                  setCurrentStepIndex(0);
                }}
                className="mt-4 h-10 w-full rounded-lg bg-[#47564c] px-4 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] sm:w-auto"
              >
                {resetFormText[locale as Locale]}
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="bg-opacity-95 absolute inset-0 z-10 flex items-center justify-center bg-white p-6 text-center">
            <p>{pleaseWaitText[locale as Locale]}</p>
          </div>
        )}

        {mainFormTitle !== undefined && definedSteps.length > 1 && (
          <h2 className="mb-4 font-['Montserrat'] text-lg font-extrabold text-[#47564c]">
            {mainFormTitle}
          </h2>
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
              field={currentActualStep}
              form={formFromProperties}
              formMethods={formMethods}
            />
          </React.Fragment>

          {definedSteps.length === 1 && !isLoading && !hasSubmitted ? (
            <button
              type="submit"
              disabled={isLoading}
              form={formID}
              className="mt-6 h-10 w-full cursor-pointer rounded-lg bg-[#47564c] font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] disabled:opacity-50"
            >
              {submitButtonLabel}
            </button>
          ) : (
            definedSteps.length > 1 &&
            !isLoading &&
            !hasSubmitted && (
              <div className="mt-6 flex flex-col space-y-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                {isFirstStep ? (
                  <span className="hidden sm:block sm:w-1/3" />
                ) : (
                  <button
                    type="button"
                    onClick={goToPreviousStep}
                    disabled={isLoading}
                    className="h-10 w-full rounded-lg bg-gray-300 px-5 py-2 font-['Montserrat'] text-base font-semibold text-gray-700 transition duration-300 hover:bg-gray-400 disabled:opacity-50 sm:w-auto"
                  >
                    {previousStepText[locale as Locale]}
                  </button>
                )}

                {isLastStep ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    form={formID}
                    className="h-10 w-full rounded-lg bg-[#47564c] px-5 py-2 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] disabled:opacity-50 sm:w-auto"
                  >
                    {submitButtonLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={goToNextStepHandler}
                    disabled={isLoading}
                    className="h-10 w-full rounded-lg bg-[#47564c] px-5 py-2 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] disabled:opacity-50 sm:w-auto"
                  >
                    {nextStepText[locale as Locale]}
                  </button>
                )}
              </div>
            )
          )}
        </div>
      </form>
    </div>
  );
};
