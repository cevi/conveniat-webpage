//@ts-nocheck

'use client';

import React, { useCallback, useState } from 'react';
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types';
import { fields } from './fields';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { buildInitialFormState } from './build-initial-form-state';
import { RichText } from '@payloadcms/richtext-lexical/react';

export type Value = unknown;

export interface Property {
  [key: string]: Value;
}
export type FormBlockType = {
  blockName?: string;
  blockType?: 'formBlock';
  form: FormType;
};
export interface Data {
  [key: string]: Property | Property[] | Value;
}
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

  const formMethods = useForm({
    //@ts-ignore
    defaultValues: buildInitialFormState(formFromProperties.fields),
  });
  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
  } = formMethods;

  const [isLoading, setIsLoading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState<boolean>();
  const [error, setError] = useState<{ message: string; status?: string } | undefined>();
  const router = useRouter();
  const onSubmit = useCallback(
    (data: Data) => {
      let loadingTimerID: ReturnType<typeof setTimeout>;
      const submitForm = async () => {
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

          const res = await request.json();

          clearTimeout(loadingTimerID);

          if (request.status >= 400) {
            setIsLoading(false);

            setError({
              message: res.errors?.[0].message || 'Internal Server Error',
              status: res.status,
            });

            return;
          }

          setIsLoading(false);
          setHasSubmitted(true);

          if (confirmationType === 'redirect' && redirect) {
            const { url } = redirect;
            const redirectURL = url;
            if (redirectURL) router.push(redirectURL);
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
    },
    [router, formID, redirect, confirmationType],
  );
  return (
    <div>
      {!isLoading && hasSubmitted && confirmationType === 'message' && (
        <RichText data={confirmationMessage} />
      )}
      {isLoading && !hasSubmitted && <p>Loading, please wait...</p>}
      {error && <div>{`${error.status || 500}: ${error.message || ''}`}</div>}
      {!hasSubmitted && (
        <form
          className="mx-auto h-auto w-[390px] rounded-md bg-white p-4 shadow-md"
          id={formID}
          onSubmit={handleSubmit(onSubmit)}
        >
          <div>
            <h2 className="mb-4 font-['Montserrat'] text-lg font-extrabold text-[#47564c]">
              {title}
            </h2>
            {formFromProperties.fields.map((field, index) => {
              const Field: React.FC<any> = fields[field.blockType];
              return (
                <React.Fragment key={index}>
                  <Field
                    form={formFromProperties}
                    {...field}
                    {...formMethods}
                    control={control}
                    errors={errors}
                    register={register}
                  />
                </React.Fragment>
              );
            })}
          </div>
          <button
            type="submit"
            form={formID}
            className="h-10 w-full rounded-lg bg-[#47564c] font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f]"
          >
            {submitButtonLabel}
          </button>
        </form>
      )}
    </div>
  );
};
