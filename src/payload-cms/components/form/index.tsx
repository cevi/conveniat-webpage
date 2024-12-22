import React from "react"
import type { Form as FormType } from '@payloadcms/plugin-form-builder/types'
import {fields} from './fields'

export type FormBlockType = {
    blockName?: string
    blockType?: 'formBlock'
    form: FormType
  }

  export const FormBlock: React.FC<FormBlockType & { id?: string}
  > = (props) => {
    const {
        form: formFromProps,
        form: {id: formID, submitButtonLabel } = {}
    } = props;
    // TODO: add onSubmit etc.
    return (
        <form id={formID}>
            <div>
                { formFromProps && formFromProps.fields && formFromProps.fields.map((field, index) => {
                    const Field: React.FC<any> = fields?.[field.blockType];
                    if(Field) {
                        return (
                            <React.Fragment key={index}>
                                <Field
                                    form={formFromProps}
                                    {...field}
                                    />
                            </React.Fragment>
                        )
                    }
                    return null;
                })}
            </div>
            <button type="submit" form={formID}>{submitButtonLabel}</button>
        </form>
    )

  }