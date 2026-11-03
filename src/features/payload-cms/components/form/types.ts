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

/** Quantities of the materials an editor lists, for a Hof's material order. */
export interface MaterialListBlock {
  blockType: 'materialList';
  name: string;
  label?: string;
  required?: boolean;
  items?:
    { id?: string | null; name: string; section?: string | null; step?: number | null }[] | null;
  placement?: 'sidebar' | 'main';
}

/**
 * The Hof relatives register for on the Besuchstag; the day follows from its Quartier, or is
 * picked by a visitor without a Hof.
 */
export interface VisitDaySelectionBlock {
  blockType: 'visitDaySelection';
  name: string;
  label?: string;
  required?: boolean;
  /** the field asking how many persons come */
  personCountField: string;
  /** the answer the server stores the day under */
  dayField: string;
  /** the answer the server stores the registration number under */
  registrationNumberField: string;
  /** the answer the lunch choice is stored under; without it the field does not ask */
  lunchField?: string | null;
  /** the answer to whom the visitors come to see; without it the Hof list offers "no Hof" */
  visitorTypeField?: string | null;
  /** the answer with the name of the visited child; without it the field does not ask */
  childNameField?: string | null;
  /** the most persons per registration; without it the form asks for them in its own field */
  maxPersons?: number | null;
  placement?: 'sidebar' | 'main';
}

export type FormFieldBlock = (
  PayloadFormFieldBlock | FileUploadBlock | MaterialListBlock | VisitDaySelectionBlock
) & {
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

export interface HofSelectionBlock {
  blockType: 'hofSelection';
  name: string;
  label?: string;
  required?: boolean;
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
  /** How many separate ranges a helper may mark; unset means one. */
  maxRanges?: number | null | undefined;
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
  fields: (FormFieldBlock | JobSelectionBlock | HofSelectionBlock | DateSlotSelectionBlock)[];
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
  fields: (
    | FormFieldBlock
    | ConditionedBlock
    | JobSelectionBlock
    | HofSelectionBlock
    | DateSlotSelectionBlock
  )[];
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
