import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { Required } from '@/features/payload-cms/components/form/required';
import { fieldIsRequiredText } from '@/features/payload-cms/components/form/static-form-texts';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import type { Locale } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { cn } from '@/utils/tailwindcss-override';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import type { CheckboxField } from 'payload';
import type React from 'react';
import type {
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
  UseFormRegister,
} from 'react-hook-form';

export const Checkbox: React.FC<
  {
    error?: FieldError | Merge<FieldError, FieldErrorsImpl<FieldValues>>;
    registerAction: UseFormRegister<string & FieldValues>;
    label: SerializedEditorState;
    highlighted?: boolean;
  } & Omit<CheckboxField, 'label'>
> = ({ name, label, registerAction, required: requiredFromProperties, error, highlighted }) => {
  // set default values
  requiredFromProperties ??= false;
  const hasError = error !== undefined;
  const locale = useCurrentLocale(i18nConfig);

  if (highlighted === true) {
    return (
      <div
        // keyboard focus is a ring inside the box, which keeps its colour
        className={cn(
          'mb-4 rounded-2xl border p-4 shadow-2xs transition-all duration-200 has-[input:focus-visible]:outline-2 has-[input:focus-visible]:-outline-offset-[6px]',
          hasError
            ? 'has-[input:focus-visible]:outline-danger border-red-400 bg-red-50/40'
            : 'has-[input:focus-visible]:outline-conveniat-green border-amber-200/80 bg-amber-50/60 hover:border-amber-300',
        )}
      >
        <div className="flex items-start">
          <input
            id={name}
            className={cn(
              'mt-0.5 size-5 shrink-0 cursor-pointer focus-visible:outline-none',
              hasError ? 'accent-danger' : 'accent-conveniat-green',
            )}
            type="checkbox"
            {...registerAction(name, {
              required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
            })}
          />

          <label
            className="ml-3 min-w-0 flex-1 font-['Inter'] text-sm leading-relaxed font-medium break-words hyphens-auto text-amber-950 [&_div]:inline [&_p]:inline"
            htmlFor={name}
            lang={locale}
          >
            <LexicalRichTextSection richTextSection={label} locale={locale as Locale} />
            {requiredFromProperties && <Required />}
          </label>
        </div>
        {hasError && (
          <p className="mt-2 text-xs text-red-600">{(error as { message?: string }).message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4">
      {/* a row like an option of a choice: the label is part of the target, and keyboard focus
          is the surface with a ring inside, red while the field has an error */}
      <div
        className={cn(
          '-mx-3 flex items-start rounded-xl px-3 py-2.5',
          hasError
            ? 'has-[input:focus-visible]:focus-surface-danger'
            : 'has-[input:focus-visible]:focus-surface',
        )}
      >
        <input
          id={name}
          className={cn(
            'mt-0.5 size-5 shrink-0 cursor-pointer focus-visible:outline-none',
            hasError ? 'accent-danger' : 'accent-conveniat-green',
          )}
          type="checkbox"
          {...registerAction(name, {
            required: requiredFromProperties ? fieldIsRequiredText[locale as Locale] : false,
          })}
        />

        <label
          className="ml-3 min-w-0 flex-1 cursor-pointer font-['Inter'] text-sm font-medium break-words hyphens-auto text-gray-500 hover:text-gray-900 [&_div]:inline [&_p]:inline"
          htmlFor={name}
          lang={locale}
        >
          <LexicalRichTextSection richTextSection={label} locale={locale as Locale} />
          {requiredFromProperties && <Required />}
        </label>
      </div>
      {hasError && (
        <p className="mt-1 text-xs text-red-600">{(error as { message?: string }).message}</p>
      )}
    </div>
  );
};
