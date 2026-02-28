import { LexicalRichTextSection } from '@/features/payload-cms/components/content-blocks/lexical-rich-text-section';
import { type Locale, type StaticTranslationString } from '@/types/types';
import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical';
import React from 'react';

const resetFormText: StaticTranslationString = {
  en: 'Reset Form',
  de: 'Formular zurücksetzen',
  fr: 'Réinitialiser le formulaire',
};

interface SubmissionMessageProperties {
  content?: SerializedEditorState;
  onReset: () => void;
  locale: Locale;
}

export const SubmissionMessage: React.FC<SubmissionMessageProperties> = ({
  content,
  onReset,
  locale,
}) => {
  return (
    <div className="flex w-full flex-col items-center justify-center space-y-6 rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
      <div className="max-w-md">
        {content && <LexicalRichTextSection richTextSection={content} locale={locale} />}
        <button
          type="button"
          onClick={onReset}
          className="bg-conveniat-green mt-4 h-10 w-full cursor-pointer rounded-lg px-4 font-['Montserrat'] text-base font-bold text-green-100 transition duration-300 hover:bg-green-600 sm:w-auto"
        >
          {resetFormText[locale]}
        </button>
      </div>
    </div>
  );
};
