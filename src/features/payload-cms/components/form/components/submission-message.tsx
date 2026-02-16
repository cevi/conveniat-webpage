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
    <div className="bg-opacity-95 absolute inset-0 z-10 flex flex-col items-center justify-center bg-white p-6 text-center">
      <div className="max-w-md">
        {content && <LexicalRichTextSection richTextSection={content} locale={locale} />}
        <button
          type="button"
          onClick={onReset}
          className="bg-conveniat-green mt-4 h-10 w-full rounded-lg px-4 font-['Montserrat'] text-base font-bold text-[#e1e6e2] transition duration-300 hover:bg-[#3b4a3f] sm:w-auto"
        >
          {resetFormText[locale]}
        </button>
      </div>
    </div>
  );
};
