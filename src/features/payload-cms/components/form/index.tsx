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
import React, { useState } from 'react';
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
  fr: 'Chargement, veuillez patient',
};

interface FormFieldRendererProperties {
  field:
    | FormFieldBlock
    | {
        id: string;
        blockType: 'formPage';
        pageTitle: string;
        fields: FormFieldBlock[];
      };
  form: FormType & {
    _localized_status: { published: boolean };
  };
  formMethods: ReturnType<typeof useForm>;
}

const FormFieldRenderer: React.FC<FormFieldRendererProperties> = ({ field, form, formMethods }) => {
  const { control, register } = formMethods;
  const FieldComponent = fields[field.blockType as keyof typeof fields];

  if (field.blockType === 'formPage') {
    return (
      <>
        <h3>{field.pageTitle}</h3>
        {field.fields.map((fieldChild, indexChild) => {
          const FieldChildComponent = fields[fieldChild.blockType as keyof typeof fields];
          if (!FieldChildComponent) {
            console.error(`Field type ${fieldChild.blockType} is not supported`);
            return <></>;
          }
          return (
            <React.Fragment
              key={
                'id' in fieldChild
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
  }

  if (!FieldComponent) {
    console.error(`Field type ${field.blockType} is not supported`);
    return <></>;
  }

  return (
    <React.Fragment key={'id' in field ? (field.id as string) : `field-${field.blockType}`}>
      <FieldComponent
        form={form}
        {...field}
        {...formMethods}
        control={control}
        registerAction={register}
      />
    </React.Fragment>
  );
};

export const FormBlock: React.FC<FormBlockType & { id?: string }> = (properties) => {
  const {
    form: formFromProperties,
    form: {
      id: formID,
      title,
      confirmationMessage,
      confirmationType,
      redirect,
      submitButtonLabel,
    } = {},
  } = properties;

  const locale = useCurrentLocale(i18nConfig);
  const formMethods = useForm({
    defaultValues: buildInitialFormState(formFromProperties.fields),
  });

  const { handleSubmit } = formMethods;
  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>();
  const [error, setError] = useState<{ message: string; status?: string } | undefined>();
  const router = useRouter();

  const onSubmit = (data: Data): void => {
    let loadingTimerID: ReturnType<typeof setTimeout>;
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
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        const response = request.json();
        clearTimeout(loadingTimerID);
        if (request.status >= 400) {
          setIsLoading(false);

          setError({
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment
            message: response.errors?.[0].message ?? 'Internal Server Error',
            // @ts-ignore
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            status: response.status,
          });

          return;
        }

        setIsLoading(false);
        setHasSubmitted(true);

        if (confirmationType === 'redirect' && redirect) {
          const { url } = redirect;
          const redirectURL = url;
          if (redirectURL !== '') router.push(redirectURL);
        }
      } catch (error_) {
        console.warn(error_);
        setIsLoading(false);
        setError({
          message: 'Something went wrong.',
        });
      }
    };

    void submitForm();
  };

  if (!formFromProperties._localized_status.published) {
    return <></>;
  }

  return (
    <div>
      {error && <div>{`${error.status ?? 500}: ${error.message}`}</div>}
      <form
        className="relative mx-auto h-auto max-w-xl rounded-md border-2 border-gray-200 bg-white p-6"
        id={formID}
        onSubmit={(event?: React.BaseSyntheticEvent) => {
          handleSubmit(onSubmit)(event).catch((error_: unknown) => console.warn(error_));
        }}
      >
        {!isLoading && hasSubmitted === true && confirmationType === 'message' && (
          <div
            className="absolute z-10 bg-white p-6 text-center"
            style={{ height: 'calc(100% - 3rem)', width: 'calc(100% - 3rem)' }}
          >
            <RichText data={confirmationMessage as SerializedEditorState} />

            <button
              type="button"
              onClick={() => {
                setHasSubmitted(false);
                formMethods.reset();
              }}
              className="mt-4 h-10 w-full rounded-lg bg-[#47564c] font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f]"
            >
              {resetFormText[locale as Locale]}
            </button>
          </div>
        )}

        {isLoading && hasSubmitted === false && (
          <div
            className="absolute bg-white text-center"
            style={{ height: 'calc(100% - 4rem)', width: 'calc(100% - 4rem)' }}
          >
            <p>{pleaseWaitText[locale as Locale]}</p>
          </div>
        )}

        <div>
          <h2 className="mb-4 font-['Montserrat'] text-lg font-extrabold text-[#47564c]">
            {title}
          </h2>
          {formFromProperties.fields.map((field, index) => (
            <FormFieldRenderer
              key={'id' in field ? (field.id as string) : `field-${index}`}
              field={field}
              form={formFromProperties}
              formMethods={formMethods}
            />
          ))}
        </div>
        <button
          type="submit"
          form={formID}
          className="h-10 w-full cursor-pointer rounded-lg bg-[#47564c] font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f]"
        >
          {submitButtonLabel}
        </button>
      </form>
    </div>
  );
};
