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

export interface DateSlotSelectionBlock {
  blockType: 'dateSlotSelection';
  name: string;
  label?: string;
  required?: boolean;
  startDate?: string | null | undefined;
  endDate?: string | null | undefined;
  /** Shortest range a helper may mark, in days. */
  minDays?: number | null | undefined;
  /** Longest range a helper may mark, in days; unset means up to the last day. */
  maxDays?: number | null | undefined;
  /** When set, a Ressort preference is asked alongside the range, under this field name. */
  ressortName?: string | null | undefined;
  ressortLabel?: string | null | undefined;
  ressortRequired?: boolean | null | undefined;
  placement?: 'sidebar' | 'main';
}

export interface ConditionedBlock {
  blockType: 'conditionedBlock';
  id?: string;
  displayCondition: {
    field: string;
    value: string;
  };
  fields: (FormFieldBlock | JobSelectionBlock | DateSlotSelectionBlock)[];
  placement?: 'sidebar' | 'main';
}

export interface FormSection {
  id: string;
  sectionTitle: string;
  layout: 'standard' | 'split';
  /**
   * Skips the whole step unless `field` currently holds `value`. An empty or missing
   * `field` means the step is always shown.
   */
  displayCondition?: {
    field?: string | null;
    value?: string | null;
  } | null;
  fields: (FormFieldBlock | ConditionedBlock | JobSelectionBlock | DateSlotSelectionBlock)[];
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
