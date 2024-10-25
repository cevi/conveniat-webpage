import { useDocumentInfo } from '@payloadcms/ui'
import { locales as localesDefinition } from '@/utils/globalDefinitions'
import { Locale } from 'payload'
import { Blog } from '@/payload-types'
import { useEffect, useMemo, useState } from 'react'
import { useLocalizedDoc } from '@/utils/localizedCollection/utils'

/**
 * Hook to check if a document is published in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 *
 */
export const useIsPublished = () => {
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPublished, setIsPublished] = useState<{ [p: string]: boolean } | undefined>(undefined)

  const {
    error: _error,
    doc: _doc,
    isLoading: _isLoading,
  } = useLocalizedDoc<Blog>({ draft: false })

  useEffect(() => {
    setError(_error)
    setIsLoading(_isLoading)

    if (_doc) {
      const published = localesDefinition
        .map((l: Locale) => l.code)
        .reduce((acc, locale) => {
          const state = _doc._localized_status[locale]?.published
          return { ...acc, [locale]: state }
        }, {})
      setIsPublished(published)
    }
  }, [_doc, _error, _isLoading])

  return { isPublished, isLoading, error }
}

const hasDiffs = (locale: string, fieldDefs, doc1, doc2): boolean => {
  const ignoredFields = ['updatedAt', 'createdAt', '_status']

  for (const fieldDef of fieldDefs) {
    const field = fieldDef.name

    if (ignoredFields.includes(field)) {
      continue
    }

    const fieldType = fieldDef.type
    const isLocalized = fieldDef.localized
    const isPresentational = fieldDef.presentational

    if (fieldType == 'collapsible') {
      if (hasDiffs(locale, fieldDef.fields, doc1, doc2)) {
        return true
      }
    }

    const value1 = doc1[field]
    const value2 = doc2[field]

    if (isLocalized && value1[locale] !== value2[locale]) {
      return true
    }

    if (!isLocalized && !isPresentational && value1 !== value2) {
      return true
    }
  }

  return false
}

/**
 * Hook to check if a document has pending changes in all locales
 *
 * @returns an object with the locales as keys and a boolean as value
 */
export const useHasPendingChanges = () => {
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState<
    { [p: string]: boolean } | undefined
  >(undefined)

  const {
    error: _error_draft,
    doc: _doc_draft,
    isLoading: _isLoading_draft,
  } = useLocalizedDoc({ draft: true })
  const { error: _error, doc: _doc, isLoading: _isLoading } = useLocalizedDoc({ draft: false })

  const { docConfig } = useDocumentInfo()
  const fields = useMemo(() => docConfig?.fields, [docConfig?.fields])

  useEffect(() => {
    setError(_error || _error_draft)
    setIsLoading(_isLoading || _isLoading_draft)

    if (fields && _doc && _doc_draft) {
      const hasChanges: {
        [p: string]: boolean
      } = localesDefinition
        .map((l: Locale) => l.code)
        .reduce(
          (acc, locale) => ({
            ...acc,
            [locale]: hasDiffs(locale, fields, _doc, _doc_draft),
          }),
          {},
        )

      setHasUnpublishedChanges(hasChanges)
    }
  }, [_doc, _doc_draft, _error, _error_draft, _isLoading, _isLoading_draft, fields])

  return { hasUnpublishedChanges, isLoading, error }
}
