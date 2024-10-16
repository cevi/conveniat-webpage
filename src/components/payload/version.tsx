'use client'

import { useDocumentInfo } from '@payloadcms/ui'
import { useEffect, useState } from 'react'

const dashboardWelcomeBanner = () => {

  const doc = useDocumentInfo()
  const id = doc.id as string

  const [enUSDoc, setEnUSDoc] = useState(null)
  const [deCHDoc, setDeCHDoc] = useState(null)
  const [frCHDoc, setFrCHDoc] = useState(null)


  const enUSRes = `/api/blog/${id}?depth=1&draft=false&locale=en-US`
  const deCHRes = `/api/blog/${id}?depth=1&draft=false&locale=de-CH`
  const frCHRes = `/api/blog/${id}?depth=1&draft=false&locale=fr-CH`

  useEffect(() => {

    const intervalId = setInterval(() => {
      const _enUSDoc = fetch(enUSRes).then(res => res.json())
      const _deCHDoc = fetch(deCHRes).then(res => res.json())
      const _frCHDoc = fetch(frCHRes).then(res => res.json())

      _enUSDoc.then(data => setEnUSDoc(data))
      _deCHDoc.then(data => setDeCHDoc(data))
      _frCHDoc.then(data => setFrCHDoc(data))
    }, 1000)

    return () => clearInterval(intervalId)

  }, [id])

  const publishedEn = enUSDoc?._localized_status?.published || undefined
  const publishedDe = deCHDoc?._localized_status?.published || undefined
  const publishedFr = frCHDoc?._localized_status?.published || undefined

  if (enUSDoc == undefined || deCHDoc == undefined || frCHDoc == undefined) {
    return (<div className="mb-8">
      <div className="my-3">
        <span className="text-sm font-medium me-2 py-0.5">Published in </span>
        <span className="bg-gray-100 text-gray-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-gray-900 dark:text-gray-300">
          Loading...
        </span>
      </div>
      <hr />
    </div>)
  }


  return (
    <div className="mb-8">
      <div className="my-3">
        <span className="text-sm font-medium me-2 py-0.5">Published in </span>
        {
          publishedEn ? (
            <span
              className="bg-green-100 text-green-600 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Englisch</span>
          ) : (
            <span
              className="bg-red-100 text-red-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Englisch</span>
          )
        }


        {
          publishedDe ? (
            <span
              className="bg-green-100 text-green-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Deutsch</span>
          ) : (
            <span
              className="bg-red-100 text-red-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Deutsch</span>
          )
        }

        {
          publishedFr ? (
            <span
              className="bg-green-100 text-green-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">Französisch</span>
          ) : (
            <span
              className="bg-red-100 text-red-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">Französisch</span>
          )
        }
      </div>
      <hr />
    </div>
  )
}

export default dashboardWelcomeBanner
