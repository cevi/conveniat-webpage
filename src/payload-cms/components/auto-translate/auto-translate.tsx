'use client';

import { FormSubmit } from '@payloadcms/ui';
import React, { useState } from 'react';

const LanguageSelectionModal: React.FC<{
  onClose: () => void;
  onTranslate: (source: string, target: string) => void;
}> = ({ onClose, onTranslate }) => {
  const [sourceLanguage, setSourceLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
      <div className="text-black rounded bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-medium">Select Source and Target Languages</h2>

        <label className="mb-2 block">
          Source Language:
          <select
            className="mt-1 block w-full border p-2"
            value={sourceLanguage}
            onChange={(event) => setSourceLanguage(event.target.value)}
          >
            <option value="">Select source language</option>
            <option value="en-US">English</option>
            <option value="fr-CH">French</option>
            <option value="de-CH">German</option>
          </select>
        </label>

        <label className="mb-2 block">
          Source Language:
          <select
            className="mt-1 block w-full border p-2"
            value={targetLanguage}
            onChange={(event) => setTargetLanguage(event.target.value)}
          >
            <option value="">Select source language</option>
            <option value="en">English</option>
            <option value="fr-CH">French</option>
            <option value="de-CH">German</option>
          </select>
        </label>

        <div className="flex justify-end">
          <button className="mr-2 rounded bg-gray-500 px-4 py-2 text-white" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded bg-blue-500 px-4 py-2 text-white"
            onClick={() => onTranslate(sourceLanguage, targetLanguage)}
          >
            Translate
          </button>
        </div>
      </div>
    </div>
  );
};

const AutoTranslate: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  const handleTranslate = (source: string, target: string) => {
    // Call your third-party translation service here
    console.log('Translating from', source, 'to', target);
    setModalOpen(false);

    // copy the entries to the target language and save the changes
    // TODO: Implement the translation logic

    // save the changes in the target language
    // TODO: Implement the save logic
  };

  return (
    <div className="divide-slate-600 mb-8">
      <div className="my-3">
        <p className="max-w-prose text-sm font-medium text-gray-600">
          We allow for automatic translation of content. Click on auto-translate to translate your
          content into multiple languages. You are asked to specify the source language and the
          target languages. The translation will be done by a third-party service.
        </p>

        <FormSubmit size="medium" type="button" onClick={() => setModalOpen(true)}>
          Auto-translate
        </FormSubmit>

        <hr className="my-8 h-px border-0 bg-gray-200 dark:bg-gray-700" />
      </div>

      {modalOpen && (
        <LanguageSelectionModal onClose={() => setModalOpen(false)} onTranslate={handleTranslate} />
      )}
    </div>
  );
};

export default AutoTranslate;
