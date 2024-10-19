'use client'

import { FormSubmit } from '@payloadcms/ui'
import { useState } from 'react'

const LanguageSelectionModal = ({
  onClose,
  onTranslate,
}: {
  onClose: () => void
  onTranslate: (source: string, target: string) => void
}) => {
  const [sourceLanguage, setSourceLanguage] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('')

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow-lg text-black">
        <h2 className="text-lg font-medium mb-4">Select Source and Target Languages</h2>

        <label className="block mb-2">
          Source Language:
          <select
            className="block w-full mt-1 p-2 border"
            value={sourceLanguage}
            onChange={(e) => setSourceLanguage(e.target.value)}
          >
            <option value="">Select source language</option>
            <option value="en-US">English</option>
            <option value="fr-CH">French</option>
            <option value="de-CH">German</option>
          </select>
        </label>

        <label className="block mb-2">
          Source Language:
          <select
            className="block w-full mt-1 p-2 border"
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value)}
          >
            <option value="">Select source language</option>
            <option value="en">English</option>
            <option value="fr-CH">French</option>
            <option value="de-CH">German</option>
          </select>
        </label>

        <div className="flex justify-end">
          <button className="bg-gray-500 text-white px-4 py-2 mr-2 rounded" onClick={onClose}>
            Cancel
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded"
            onClick={() => onTranslate(sourceLanguage, targetLanguage)}
          >
            Translate
          </button>
        </div>
      </div>
    </div>
  )
}

const AutoTranslate = () => {
  const [isModalOpen, setModalOpen] = useState(false)

  const handleTranslate = (source: string, target: string) => {
    // Call your third-party translation service here
    console.log('Translating from', source, 'to', target)
    setModalOpen(false)

    // copy the entries to the target language and save the changes
    // TODO: Implement the translation logic

    // save the changes in the target language
    // TODO: Implement the save logic
  }

  return (
    <div className="mb-8 divide-slate-600">
      <div className="my-3">
        <p className="text-sm font-medium text-gray-600 max-w-prose">
          We allow for automatic translation of content. Click on auto-translate to translate your
          content into multiple languages. You are asked to specify the source language and the
          target languages. The translation will be done by a third-party service.
        </p>

        <FormSubmit size="medium" type="button" onClick={() => setModalOpen(true)}>
          Auto-translate
        </FormSubmit>

        <hr className="h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
      </div>

      {isModalOpen && (
        <LanguageSelectionModal onClose={() => setModalOpen(false)} onTranslate={handleTranslate} />
      )}
    </div>
  )
}

export default AutoTranslate
