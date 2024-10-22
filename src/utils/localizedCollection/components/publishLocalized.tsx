'use client'

import type { MappedComponent } from 'payload'
import * as qs from 'qs-esm'

import React, { useCallback } from 'react'
import {
  FormSubmit,
  RenderComponent,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormModified,
  useHotkey,
  useLocale,
  useOperation,
  useTranslation,
} from '@payloadcms/ui'
import { cva } from 'class-variance-authority'
import { useIsPublished } from '@/utils/localizedCollection/hooks'

/**
 * Default Publish button for localized collections
 *
 * This class is based on https://github.com/payloadcms/payload/blob/beta/packages/ui/src/elements/PublishButton/index.tsx
 * but heavily modified to support publishing in specific locales.
 *
 */
export const DefaultPublishButton: React.FC<{ label?: string }> = () => {
  const {
    id,
    collectionSlug,
    docConfig,
    globalSlug,
    hasPublishPermission,
    publishedDoc,
    unpublishedVersions,
  } = useDocumentInfo()

  const { config } = useConfig()
  const { submit } = useForm()
  const modified = useFormModified()
  const editDepth = useEditDepth()
  const { code: locale } = useLocale()

  const {
    routes: { api },
    serverURL,
  } = config

  const { t } = useTranslation()
  const { code } = useLocale()

  const hasNewerVersions = (unpublishedVersions?.totalDocs || 0) > 0
  const canPublish = hasPublishPermission && (modified || hasNewerVersions || !publishedDoc)
  const operation = useOperation()

  const forceDisable = operation === 'update' && !modified

  const saveDraft = useCallback(async () => {
    if (forceDisable) {
      return
    }

    const search = `?locale=${locale}&depth=0&fallback-locale=null&draft=true`
    let action
    let method = 'POST'

    if (collectionSlug) {
      action = `${serverURL}${api}/${collectionSlug}${id ? `/${id}` : ''}${search}`
      if (id) {
        method = 'PATCH'
      }
    }

    if (globalSlug) {
      action = `${serverURL}${api}/globals/${globalSlug}${search}`
    }

    await submit({
      action,
      method,
      overrides: {
        _status: 'draft',
        _published: {
          [code]: true,
        },
      },
      skipValidation: true,
    })
  }, [forceDisable, locale, collectionSlug, globalSlug, submit, code, serverURL, api, id])

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ['s'] }, (e) => {
    e.preventDefault()
    e.stopPropagation()

    if (docConfig?.versions.drafts && docConfig.versions.drafts.autosave) {
      void saveDraft()
    }
  })

  const publishSpecificLocale = useCallback(
    (_locale: string) => {
      const params = qs.stringify({
        publishSpecificLocale: _locale,
      })

      const action = `${serverURL}${api}${
        globalSlug ? `/globals/${globalSlug}` : `/${collectionSlug}/${id ? `${'/' + id}` : ''}`
      }${params ? '?' + params : ''}`

      void submit({
        action,
        overrides: {
          _status: 'published',
          _localized_status: {
            published: true,
          },
        },
      })
    },
    [api, collectionSlug, globalSlug, id, serverURL, submit],
  )

  const unpublishSpecificLocale = useCallback(
    (_locale: string) => {
      const params = qs.stringify({
        publishSpecificLocale: _locale,
      })

      const action = `${serverURL}${api}${
        globalSlug ? `/globals/${globalSlug}` : `/${collectionSlug}/${id ? `${'/' + id}` : ''}`
      }${params ? '?' + params : ''}`

      void submit({
        action,
        overrides: {
          _status: 'published',
          _localized_status: {
            published: false,
          },
        },
      })
    },
    [api, collectionSlug, globalSlug, id, serverURL, submit],
  )

  const isPublished = useIsPublished(1000)

  if (!hasPublishPermission) {
    return null
  }

  const unpublishClasses = cva({
    'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100': true,
    'cursor-not-allowed opacity-50': !isPublished[code],
  })

  return (
    <div className="flex gap-2">
      {/*
       We patch the version actions. We cannot use the default diff algorithm and version reset
       for our modified localization system. Thus, we disable it completely.
      */}
      <style>
        {`
          .doc-controls__status {
            display: none;
          }`}
      </style>
      <FormSubmit
        className={unpublishClasses()}
        buttonId="action-save"
        disabled={!isPublished[code]}
        onClick={() => unpublishSpecificLocale(code)}
        size="medium"
        type="button"
      >
        Unpublish in {code}
      </FormSubmit>
      <FormSubmit
        className="bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100"
        buttonId="action-save"
        disabled={!canPublish && isPublished[code]}
        onClick={() => publishSpecificLocale(code)}
        size="medium"
        type="button"
      >
        {t('version:publishIn', { locale: code })}
      </FormSubmit>
    </div>
  )
}

type Props = {
  CustomComponent?: MappedComponent
}

const PublishButton: React.FC<Props> = ({ CustomComponent }) => {
  if (CustomComponent) {
    return <RenderComponent mappedComponent={CustomComponent} />
  }
  return <DefaultPublishButton />
}

export default PublishButton
