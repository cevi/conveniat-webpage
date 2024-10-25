import { useDocumentInfo } from '@payloadcms/ui'
import { locales as localesDefinition } from '@/utils/globalDefinitions'
import { Locale } from 'payload'
import { Blog } from '@/payload-types'
import { useEffect, useState } from 'react'

/**
 * Hook to check if a document is published in all locales
 *
 * @param refetchIntervall the intervall to refetch the document content, disable if set to 0
 * @returns an object with the locales as keys and a boolean as value
 *
 */
export const useIsPublished = (refetchIntervall: number = 0) => {
  const _doc = useDocumentInfo()
  const id = _doc.id as string

  const document: Blog = useLocalizedDoc('blog', id, false, refetchIntervall) as unknown as Blog

  const locales: string[] = localesDefinition.map((l: Locale) => l.code)
  const [isPublished, setIsPublished] = useState<{ [p: string]: undefined | boolean }>({
    ...locales
      .map((locale) => ({ [locale]: undefined }))
      .reduce((acc, val) => Object.assign(acc, val), {}),
  })

  const localized_status = document._localized_status as {
    [key: string]: {
      published: boolean
    }
  }

  useEffect(() => {
    if (!document._localized_status) return

    const published = locales.map((locale) => localized_status[locale].published)
    setIsPublished({
      ...locales
        .map((locale, index) => ({ [locale]: published[index] }))
        .reduce((acc, val) => Object.assign(acc, val), {}),
    })
  }, [document, locales])

  return isPublished
}

/**
 * Hook to check if a document has pending changes in all locales
 *
 * @param refetchIntervall the intervall to refetch the document content, disable if set to 0
 * @returns an object with the locales as keys and a boolean as value
 */
export const useHasPendingChanges = (refetchIntervall: number = 0) => {
  const doc = useDocumentInfo()
  const id = doc.id as string

  const locales: string[] = localesDefinition.map((l: Locale) => l.code)

  const skippedFields = ['id', '_status', '_localized_status', 'Versions', 'createdAt', 'updatedAt']
  const fields = Object.keys(doc.docPermissions?.fields || {}).filter(
    (key) => !skippedFields.includes(key),
  )

  const document: Blog = useLocalizedDoc('blog', id, false, refetchIntervall) as unknown as Blog
  const documentDraft: Blog = useLocalizedDoc('blog', id, true, refetchIntervall) as unknown as Blog

  const [hasPendingChanges, setHasPendingChanges] = useState<{ [p: string]: undefined | boolean }>({
    ...locales
      .map((locale) => ({ [locale]: undefined }))
      .reduce((acc, val) => Object.assign(acc, val), {}),
  })

  useEffect(() => {
    locales.forEach((locale) => {
      const pendingChanges = fields.some((field) => {
        // @ts-expect-error
        return documentDraft[field]?.[locale] !== document[field]?.[locale]
      })
      setHasPendingChanges((prev) => ({ ...prev, [locale]: pendingChanges }))
    })
  }, [document, documentDraft, fields, locales])

  return hasPendingChanges
}
/**
 *
 * Retrieves the localized version of a document of a given collection.
 * It uses the Payload REST API to fetch the documents
 *
 * @param slug the slug of the collection
 * @param id the id of the document
 * @param draft
 * @param refetchInterval the intervall to refetch the document content, disable if set to 0
 */
const useLocalizedDoc = async (
  slug: string,
  id: string,
  draft: boolean = false,
  refetchInterval: number = 0,
) => {
  const res = `/api/${slug}/${id}?depth=1&draft=${draft}&locale=all`
  const docs = await fetch(res).then((_response) => _response.json())

  const [doc, setDoc] = useState(docs)
  if (refetchInterval === 0) return docs

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(res)
        .then((_response) => _response.json())
        .then((docs) => setDoc(docs))
    }, refetchInterval)
    return () => clearInterval(interval)
  }, [refetchInterval])
  return doc
}
