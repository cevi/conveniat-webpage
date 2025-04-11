'use client';

import * as qs from 'qs-esm';

import React, { useCallback } from 'react';
import {
  FormSubmit,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useField,
  useForm,
  useFormModified,
  useHotkey,
  useLocale,
  useOperation,
  useTranslation,
} from '@payloadcms/ui';
import { cva } from 'class-variance-authority';
import { useIsPublished } from '@/payload-cms/hooks/is-published';
import { Config } from '@/payload-types';
import { StaticTranslationString } from '@/types';

const unpublishingActionString: StaticTranslationString = {
  en: 'Unpublish in',
  de: 'Deaktivieren in',
  fr: 'Dépublier en',
};

/**
 * Default Publish button for localized collections or globals.
 *
 * This class is based on https://github.com/payloadcms/payload/blob/beta/packages/ui/src/elements/PublishButton/index.tsx
 * but heavily modified to support publishing in specific locales.
 *
 * Globals cannot be unpublished, therefore the unpublish button is disabled for globals.
 *
 */
// eslint-disable-next-line complexity
export const PublishingButton: React.FC<{ label?: string }> = () => {
  const {
    id,
    collectionSlug,
    docConfig,
    globalSlug,
    unpublishedVersionCount,
    hasPublishPermission,
    hasPublishedDoc,
  } = useDocumentInfo();

  const { config } = useConfig();
  const { submit } = useForm();
  const modified = useFormModified();
  const editDepth = useEditDepth();
  const { code: locale } = useLocale();
  const { value: publishingState, setValue: setPublishingState } = useField({
    path: 'publishingStatus',
  });

  const {
    routes: { api },
    serverURL,
  } = config;

  const { t } = useTranslation();
  const { code } = useLocale() as { code: Config['locale'] };

  const hasNewerVersions = unpublishedVersionCount > 0;
  const canPublish =
    hasPublishPermission === true && (modified || hasNewerVersions || hasPublishedDoc);
  const operation = useOperation();

  const forceDisable = operation === 'update' && !modified;

  const saveDraft = useCallback(async () => {
    if (forceDisable) {
      return;
    }

    const search = `?locale=${locale}&depth=0&fallback-locale=null&draft=true`;
    let action;
    let method = 'POST';

    if (collectionSlug !== undefined) {
      action = `${serverURL}${api}/${collectionSlug}${id === undefined ? '' : `/${id}`}${search}`;
      if (id !== undefined) {
        method = 'PATCH';
      }
    }

    if (globalSlug !== undefined) {
      action = `${serverURL}${api}/globals/${globalSlug}${search}`;
    }

    if (action === undefined) throw new Error('Action is not defined');

    await submit({
      action,
      method,
      overrides: {
        _status: 'draft',
        _published: {
          [code]: true,
        },
        _locale: code,
      },
    })
      // this is necessary such that the publishingState is correctly updated
      .finally(() => setPublishingState(structuredClone(publishingState)));
  }, [
    forceDisable,
    locale,
    collectionSlug,
    globalSlug,
    submit,
    code,
    serverURL,
    api,
    id,
    setPublishingState,
    publishingState,
  ]);

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ['s'] }, (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (Boolean(docConfig?.versions.drafts)) {
      void saveDraft();
    }
  });

  const publishSpecificLocale = useCallback(
    (_locale: string) => {
      const parameters = qs.stringify({
        publishSpecificLocale: _locale,
      });

      const action = `${serverURL}${api}${
        globalSlug === undefined
          ? `/${collectionSlug}/${id === undefined ? '' : `/${id}`}`
          : `/globals/${globalSlug}`
      }${parameters === '' ? '' : '?' + parameters}`;

      void submit({
        action,
        overrides: {
          _status: 'published',
          _localized_status: {
            published: true,
          },
          _locale: code,
        },
      })
        // this is necessary such that the publishingState is correctly updated
        .finally(() => setPublishingState(structuredClone(publishingState)));
    },
    [
      api,
      code,
      collectionSlug,
      globalSlug,
      id,
      publishingState,
      serverURL,
      setPublishingState,
      submit,
    ],
  );

  const unpublishSpecificLocale = useCallback(
    (_locale: string) => {
      const parameters = qs.stringify({
        publishSpecificLocale: _locale,
      });

      const action = `${serverURL}${api}${
        globalSlug === undefined
          ? `/${collectionSlug}/${id === undefined ? '' : `/${id}`}`
          : `/globals/${globalSlug}`
      }${parameters === '' ? '' : '?' + parameters}`;

      void submit({
        action,
        overrides: {
          // TODO: if we unpublish the last locale of a document,
          //  we should also unpublish the document itself
          //  currently, we only unpublish the specific locale
          _status: 'published',
          _localized_status: {
            published: false,
          },
        },
      })
        // this is necessary such that the publishingState is correctly updated
        .finally(() => setPublishingState(structuredClone(publishingState)));
    },
    [api, collectionSlug, globalSlug, id, publishingState, serverURL, setPublishingState, submit],
  );

  const { isPublished, canUnpublish } = useIsPublished();

  // we ignore the publishing state for global documents
  // this we check if the globalSlug not set
  if (!isPublished && globalSlug === undefined) {
    return <></>;
  }

  const unpublishClasses = cva({
    'border-solid border border-red-300 bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100':
      true,
    'cursor-not-allowed opacity-40': isPublished?.[code] === false,
  });

  const publishClasses = cva({
    'border-solid border border-green-300 bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100':
      true,
    'cursor-not-allowed opacity-40': !canPublish && isPublished?.[code],
  });

  return (
    <div className="flex gap-2">
      {
        // global documents cannot be unpublished
        globalSlug === undefined && canUnpublish && (
          <FormSubmit
            className={unpublishClasses()}
            buttonId="action-save"
            disabled={isPublished?.[code] === false}
            onClick={() => unpublishSpecificLocale(code)}
            size="medium"
            type="button"
          >
            {unpublishingActionString[code]} {code}
          </FormSubmit>
        )
      }
      <FormSubmit
        className={publishClasses()}
        buttonId="action-save"
        disabled={(!canPublish && isPublished?.[code]) ?? true}
        onClick={() => publishSpecificLocale(code)}
        size="medium"
        type="button"
      >
        {t('version:publishIn', { locale: code })}
      </FormSubmit>
    </div>
  );
};

const PublishingButtonClientWrapper: React.FC = () => {
  return <PublishingButton />;
};

export default PublishingButtonClientWrapper;
