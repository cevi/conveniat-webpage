import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import { useCurrentLocale } from 'next-i18n-router/client';
import type { CheckboxField } from 'payload';
import type React from 'react';
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from 'react-hook-form';

export const Checkbox: React.FC<
  {
    errors: Partial<
      FieldErrorsImpl<{
        [x: string]: never;
      }>
    >;
    registerAction: UseFormRegister<string & FieldValues>;
    label: SerializedEditorState;
  } & CheckboxField
> = ({ name, label, registerAction, required: requiredFromProperties, errors }) => {
  // set default values
  requiredFromProperties ??= false;
  const hasError = errors[name];
  const locale = useCurrentLocale(i18nConfig);

  return (
    <div className="mb-4">
      <div className="flex items-start">
        <input
          id={name}
          className={`text-conveniat-green mt-[3px] h-4 w-4 rounded border-0 bg-green-100 shadow-sm ring-1 ring-inset ${hasError ? 'ring-red-500' : 'ring-transparent'} focus:ring-conveniat-green transition-all duration-200 focus:ring-2 focus:ring-offset-0 focus:outline-none`}
          type="checkbox"
          {...registerAction(name, {
            required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
          })}
        />

        <label
          className="ml-2 font-['Inter'] text-sm font-medium text-balance text-gray-500 hover:text-gray-900 [&_div]:inline [&_p]:inline"
          htmlFor={name}
        >
          <LexicalRichTextSection richTextSection={label} locale={locale as Locale} />
          {requiredFromProperties && <Required />}
        </label>
      </div>
      {hasError && <p className="mt-1 text-xs text-red-600">{hasError.message as string}</p>}
    </div>
  );
};
