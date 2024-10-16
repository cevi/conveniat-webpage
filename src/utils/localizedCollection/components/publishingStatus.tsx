'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'
import { cva } from 'class-variance-authority'
import { Blog } from '@/payload-types'
import { Locale } from 'payload'
import { locales as localesDefinition } from '@/utils/globalDefinitions'

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
const useLocalizedDoc = (slug: string, id: string, draft: boolean = false, refetchInterval: number = 0) => {
  const [doc, setDoc] = useState(null)


  useEffect(() => {
    const res = `/api/${slug}/${id}?depth=1&draft=${draft}&locale=all`

    const fetchDocs = async () => {
      setDoc(await fetch(res).then(res => res.json()))
    }

    if (refetchInterval === 0) {
      fetchDocs().then()
      return
    }

    const intervalId = setInterval(fetchDocs, refetchInterval)

    return () => clearInterval(intervalId)
  }, [id])

  return doc
}


const languageStatusClasses = cva(
  'text-sm font-medium me-2 px-2.5 py-0.5 rounded relative group',
  {
    variants: {
      pendingChanges: {
        true: '',
        false: '',
      },
      published: {
        true: '',
        false: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      },
    },
    compoundVariants: [
      {
        published: true,
        pendingChanges: true,
        className: 'border-solid border-2 border-green-900 text-green-800 dark:text-green-300',
      },
      {
        published: true,
        pendingChanges: false,
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      },
    ],
    defaultVariants: {
      published: false,
      pendingChanges: false,
    },
  },
)

const LanguageStatus = ({ published, pendingChanges, label }: {
  published: boolean,
  pendingChanges: boolean,
  label: string
}) => {

  const tooltip = pendingChanges ? 'Published but has unpublished changes' : published ? 'Published and up to date' : 'Not published'

  return (
    <span className={languageStatusClasses({ published, pendingChanges })}>
      {label}
      <span
        className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 w-max px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {tooltip}
      </span>
    </span>
  )
}

const LanguageStatusPlaceholder = ({ label }: { label: string }) => (
  <span className="bg-gray-200 text-gray-400 text-sm font-medium me-2 px-2.5 py-0.5 rounded animate-pulse">
    {label}
  </span>
)

const DashboardWelcomeBanner = () => {
  const doc = useDocumentInfo()
  const id = doc.id as string

  const document: Blog = useLocalizedDoc('blog', id, false, 1000) as unknown as Blog
  const localized_status = document?._localized_status as {
    [key: string]: {
      published: boolean
    }
  }

  const locales: string [] = localesDefinition.map((l: Locale) => l.code)

  const skippedFields = ['id', '_status', '_localized_status', 'Versions', 'createdAt', 'updatedAt']
  const fields = Object.keys(doc.docPermissions?.fields || {})
    .filter((key) => !skippedFields.includes(key))

  const documentDraft: Blog = useLocalizedDoc('blog', id, true, 1000) as unknown as Blog


  return (
    <div className="mb-8 divide-slate-600">
      <div className="my-3">
        <p className="text-sm font-medium text-gray-600 max-w-prose">
          This content type can be published in multiple languages. If you change any field, make sure to publish the
          changes in all languages you modified.
        </p>
        <span className="text-sm font-medium me-2 py-0.5 text-gray-600">Publishing Status: </span>

        {!document || !documentDraft ? (
          // Show placeholders when the document is not loaded
          locales.map(locale => (
            <LanguageStatusPlaceholder key={locale} label={locale} />
          ))
        ) : (
          // Show actual publishing status for each locale
          locales.map(locale => {
            const published = localized_status?.[locale]?.published
            const pendingChanges = fields.some(field => {
              // @ts-ignore
              return documentDraft?.[field]?.[locale] !== document?.[field]?.[locale]
            })

            return (
              <LanguageStatus
                key={locale}
                published={published}
                pendingChanges={pendingChanges}
                label={locale}
              />
            )
          })
        )}
      </div>
      <hr className="h-px my-8 bg-gray-200 border-0 dark:bg-gray-700" />
    </div>
  )

}

export default DashboardWelcomeBanner
