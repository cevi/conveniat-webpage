import type {
  FormFieldBlock as PayloadFormFieldBlock,
  Form as PayloadFormType,
} from '@payloadcms/plugin-form-builder/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

export type FormFieldBlock = PayloadFormFieldBlock;

// field types
// ...

export interface JobSelectionBlock {
  blockType: 'jobSelection';
  name: string;
  label?: string;
  required?: boolean;
  dateRangeCategory: 'setup' | 'main' | 'teardown';
  category?: string;
}

export interface ConditionedBlock {
  blockType: 'conditionedBlock';
  id?: string;
  displayCondition: {
    field: string;
    value: string;
  };
  fields: (FormFieldBlock | JobSelectionBlock)[];
}

export interface FormSection {
  id: string;
  sectionTitle: string;
  fields: (FormFieldBlock | ConditionedBlock | JobSelectionBlock)[];
}

export type ExtendedFormType = PayloadFormType & {
  autocomplete: boolean;
  sections: {
    id: string;
    formSection: FormSection;
  }[];
  _localized_status: { published: boolean };
  confirmationType?: 'message' | 'redirect';
  confirmationMessage?: SerializedEditorState;
  redirect?: {
    url: string;
  };
};

export interface FormSubmissionResponse {
  message?: string;
  errors?: { message: string }[];
}

export interface FormBlockType {
  blockName?: string;
  blockType?: 'formBlock';
  form: ExtendedFormType;
}

export { type Form as PayloadFormType } from '@payloadcms/plugin-form-builder/types';
