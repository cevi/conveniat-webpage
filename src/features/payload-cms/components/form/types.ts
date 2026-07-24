import type {
  FormFieldBlock as PayloadFormFieldBlock,
  Form as PayloadFormType,
} from '@payloadcms/plugin-form-builder/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';

export interface FileUploadBlock {
  blockType: 'fileUpload';
  name: string;
  label?: string;
  required?: boolean;
  allowedFileTypes?: 'all' | 'pdf' | 'images' | 'documents' | 'custom';
  customAllowedFileTypes?: string;
  allowMultiple?: boolean;
  placement?: 'sidebar' | 'main';
}

export type FormFieldBlock = (PayloadFormFieldBlock | FileUploadBlock) & {
  placement?: 'sidebar' | 'main';
};

export interface JobSelectionBlock {
  blockType: 'jobSelection';
  name: string;
  label?: string;
  required?: boolean;
  dateRangeCategory: 'setup' | 'main' | 'teardown';
  category?: string;
  placement?: 'sidebar' | 'main';
}

export interface ConditionedBlock {
  blockType: 'conditionedBlock';
  id?: string;
  displayCondition: {
    field: string;
    value: string;
  };
  fields: (FormFieldBlock | JobSelectionBlock)[];
  placement?: 'sidebar' | 'main';
}

export interface FormSection {
  id: string;
  sectionTitle: string;
  layout: 'standard' | 'split';
  fields: (FormFieldBlock | ConditionedBlock | JobSelectionBlock)[];
}

export type ExtendedFormType = PayloadFormType & {
  autocomplete: boolean;
  fileUploadLimitMB?: number;
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
