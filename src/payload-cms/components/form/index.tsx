'use client'

import React, { useCallback, useState } from "react"
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import {fields} from './fields'
import { useRouter } from "next/navigation"
import { RichText } from "@payloadcms/richtext-lexical/react"
import { useForm } from 'react-hook-form'
import { buildInitialFormState } from "./buildInitialFormState"

export type Value = unknown

export interface Property {
  [key: string]: Value
}
export type FormBlockType = {
    blockName?: string
    blockType?: 'formBlock'
    form: FormType
  }
  export interface Data {
    [key: string]: Property | Property[] | Value
  }  
  export const FormBlock: React.FC<FormBlockType & { id?: string}
  > = (props) => {
    const {
        form: formFromProps,
        form: {id: formID, confirmationMessage, confirmationType, redirect, submitButtonLabel } = {}
    } = props;

    const formMethods = useForm({
        //@ts-ignore
        defaultValues: buildInitialFormState(formFromProps.fields),
    })
    const {
        control,
        formState: { errors },
        getValues,
        handleSubmit,
        register,
        setValue,
    } = formMethods

    const [isLoading, setIsLoading] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState<boolean>(false)
    const router = useRouter();
    const onSubmit = useCallback(
        (data: Data) => {
            let loadingTimerID: ReturnType<typeof setTimeout>
            const submitForm = async () => {
                const dataToSend = Object.entries(data).map(([name, value]) => ({
                    field: name,
                    value
                }));
                loadingTimerID = setTimeout(() => {
                    setIsLoading(true)
                }, 1000);

                try {
                    const req = await fetch(`/api/form-submissions`,{
                        body: JSON.stringify({
                            form: formID,
                            submissionData: dataToSend,
                        }),
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        method: 'POST',
                    })

                    const res = await req.json()

                    clearTimeout(loadingTimerID)

                    if (req.status >= 400) {
                        setIsLoading(false);
                        // TODO: handle error
                        return;
                    }

                    setIsLoading(false);
                    setHasSubmitted(false);
                    
                    if(confirmationType === 'redirect' && redirect) {
                        const { url }= redirect;
                        const redirectURL = url;
                        if(redirectURL) router.push(redirectURL);
                    }
                } catch(err) {
                    console.warn(err);
                    setIsLoading(false);
                    // todo: handle error
                }
            }
            void submitForm()
        },
        [router, formID, redirect, confirmationType],
    )
    return (
        <div>
            {!isLoading && hasSubmitted && confirmationType === 'message' && (
                <p>{confirmationMessage}</p>
            )}
            {isLoading && !hasSubmitted && <p>Loading, please wait...</p>}
            {!hasSubmitted && (
                <form id={formID} onSubmit={handleSubmit(onSubmit)}>
                    <div>
                        { formFromProps && formFromProps.fields && formFromProps.fields.map((field, index) => {
                            const Field: React.FC<any> = fields?.[field.blockType];
                            if(Field) {
                                return (
                                    <React.Fragment key={index}>
                                        <Field
                                            form={formFromProps}
                                            {...field}
                                            register={register}
                                            />
                                    </React.Fragment>
                                )
                            }
                            return null;
                        })}
                    </div>
                    <button type="submit" form={formID}>{submitButtonLabel}</button>
                </form>
            )}
        </div>
    )

  }
