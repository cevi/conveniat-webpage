'use client';

import * as qs from 'qs-esm';

import { ConfirmationModal } from '@/features/payload-cms/payload-cms/components/shared/confirmation-modal';
import { usePublishingStatus } from '@/features/payload-cms/payload-cms/hooks/use-publishing-status';
import type { Config } from '@/features/payload-cms/payload-types';
import type { StaticTranslationString } from '@/types/types';
import {
  FormSubmit,
  useConfig,
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormModified,
  useHotkey,
  useLocale,
  useOperation,
} from '@payloadcms/ui';
import { cva } from 'class-variance-authority';
import React, { useCallback, useState } from 'react';

const unpublishingActionString: StaticTranslationString = {
  en: 'Unpublish in',
  de: 'Unveröffentlichen auf',
  fr: 'Dépublier en',
};

const publishActionAstring: StaticTranslationString = {
  en: 'Publish in',
  de: 'Veröffentlichen auf',
  fr: 'Publier en',
};

const languageNames: Record<string, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
};

const minimalPublishingConfirmationString: StaticTranslationString = {
  en: 'Are you sure you want to publish this document?',
  de: 'Sind Sie sicher, dass Sie dieses Dokument veröffentlichen möchten?',
  fr: 'Êtes-vous sûr de vouloir publier ce document?',
};

const confirmButtonString: StaticTranslationString = {
  en: 'Confirm',
  de: 'Bestätigen',
  fr: 'Confirmer',
};

const unpublishingConfirmationString: StaticTranslationString = {
  en: 'Are you sure you want to unpublish this document in this locale?',
  de: 'Sind Sie sicher, dass Sie dieses Dokument in dieser Sprache unveröffentlichen möchten?',
  fr: 'Êtes-vous sûr de vouloir dépublier ce document dans cette langue?',
};

const publishingTextString: StaticTranslationString = {
  en: 'Publishing...',
  de: 'Wird veröffentlicht...',
  fr: 'Publication...',
};

const unpublishingTextString: StaticTranslationString = {
  en: 'Unpublishing...',
  de: 'Wird unveröffentlicht...',
  fr: 'Dépublication...',
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
  const { code } = useLocale() as { code: Config['locale'] };
  const { publishingStatus, canUnpublish, refetch } = usePublishingStatus();

  const {
    routes: { api },
    serverURL,
  } = config;

  const isCreating = id === undefined && globalSlug === undefined;

  const hasNewerVersions = unpublishedVersionCount > 0;
  const canPublish =
    hasPublishPermission === true &&
    (modified || hasNewerVersions || hasPublishedDoc) &&
    !isCreating;
  const operation = useOperation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'publish' | 'unpublish'>('publish');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const forceDisable = operation === 'update' && !modified;

  const saveDraft = useCallback(async () => {
    if (forceDisable) {
      return;
    }

    const search = `?locale=${code}&depth=0&fallback-locale=null&draft=true`;
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
      // this is necessary such that the publishingStatus is correctly updated
      .finally(() => void refetch());
  }, [forceDisable, code, collectionSlug, globalSlug, submit, serverURL, api, id, refetch]);

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ['s'] }, (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (Boolean(docConfig?.versions?.drafts)) {
      void saveDraft();
    }
  });

  const publishSpecificLocale = useCallback(() => {
    setModalType('publish');
    setIsModalOpen(true);
  }, []);

  const unpublishSpecificLocale = useCallback(() => {
    setModalType('unpublish');
    setIsModalOpen(true);
  }, []);

  const handleConfirmPublish = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const parameters = qs.stringify({
        publishSpecificLocale: code,
      });

      const action = `${serverURL}${api}${
        globalSlug === undefined
          ? `/${collectionSlug}/${id === undefined ? '' : `/${id}`}`
          : `/globals/${globalSlug}`
      }${parameters === '' ? '' : '?' + parameters}`;

      await submit({
        action,
        overrides: {
          _status: 'published',
          _localized_status: {
            published: true,
          },
          _locale: code,
        },
      });

      // this is necessary such that the publishingStatus is correctly updated
      await refetch();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [api, code, collectionSlug, globalSlug, id, refetch, serverURL, submit]);

  const handleConfirmUnpublish = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const parameters = qs.stringify({
        publishSpecificLocale: code,
      });

      const action = `${serverURL}${api}${
        globalSlug === undefined
          ? `/${collectionSlug}/${id === undefined ? '' : `/${id}`}`
          : `/globals/${globalSlug}`
      }${parameters === '' ? '' : '?' + parameters}`;

      await submit({
        action,
        overrides: {
          _status: 'published',
          _localized_status: {
            published: false,
          },
        },
      });

      // this is necessary such that the publishingStatus is correctly updated
      await refetch();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to unpublish:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [api, code, collectionSlug, globalSlug, id, refetch, serverURL, submit]);

  const isCurrentLocalePublished = publishingStatus?.[code]?.published === true;
  const hasPendingChanges = publishingStatus?.[code]?.pendingChanges === true;

  // we ignore the publishing state for global documents
  if (publishingStatus === undefined && globalSlug === undefined) {
    return <></>;
  }

  const unpublishClasses = cva({
    'border-solid border border-red-300 bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100': true,
    'cursor-not-allowed opacity-40': !isCurrentLocalePublished,
  });

  // Determine if the publish button should be disabled due to non-unpublishable and up-to-date state
  const isLockedPublished = !canUnpublish && isCurrentLocalePublished && !hasPendingChanges;

  const publishClasses = cva({
    'border-solid border border-green-300 bg-green-200 text-green-900 dark:bg-green-700 dark:text-green-100': true,
    'cursor-not-allowed opacity-40': isLockedPublished || (!canPublish && isCurrentLocalePublished),
  });

  const showUnpublish =
    globalSlug === undefined && canUnpublish && isCurrentLocalePublished && !hasPendingChanges;

  const lockedPublishedTooltip: StaticTranslationString = {
    en: 'This page cannot be unpublished. Make changes to re-publish.',
    de: 'Diese Seite kann nicht unveröffentlicht werden. Nehmen Sie Änderungen vor, um sie erneut zu veröffentlichen.',
    fr: 'Cette page ne peut pas être dépubliée. Apportez des modifications pour la republier.',
  };

  const creatingTooltip: StaticTranslationString = {
    en: 'Saving draft... please wait.',
    de: 'Entwurf wird gespeichert... bitte warten.',
    fr: 'Enregistrement du brouillon... veuillez patienter.',
  };

  return (
    <div className="flex gap-2">
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={() =>
          void (modalType === 'publish' ? handleConfirmPublish() : handleConfirmUnpublish())
        }
        message={
          modalType === 'publish'
            ? minimalPublishingConfirmationString[code]
            : unpublishingConfirmationString[code]
        }
        isSubmitting={isSubmitting}
        locale={code}
        title={
          modalType === 'publish'
            ? `${publishActionAstring[code]} ${languageNames[code]}`
            : `${unpublishingActionString[code]} ${languageNames[code]}`
        }
        confirmLabel={confirmButtonString[code]}
        submittingText={
          modalType === 'publish' ? publishingTextString[code] : unpublishingTextString[code]
        }
        confirmVariant={modalType === 'publish' ? 'primary' : 'danger'}
      />
      {showUnpublish ? (
        <FormSubmit
          className={unpublishClasses()}
          buttonId="action-save"
          disabled={!isCurrentLocalePublished}
          onClick={() => unpublishSpecificLocale()}
          size="medium"
          type="button"
        >
          {unpublishingActionString[code]} {languageNames[code]}
        </FormSubmit>
      ) : (
        <div className="group relative">
          <FormSubmit
            className={publishClasses()}
            buttonId="action-save"
            disabled={isLockedPublished || (!canPublish && isCurrentLocalePublished) || isCreating}
            onClick={() => publishSpecificLocale()}
            size="medium"
            type="button"
          >
            {publishActionAstring[code]} {languageNames[code]}
          </FormSubmit>
          {(isLockedPublished || isCreating) && (
            <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs -translate-x-1/2 transform rounded-md bg-gray-800 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {isCreating ? creatingTooltip[code] : lockedPublishedTooltip[code]}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

const PublishingButtonClientWrapper: React.FC = () => {
  return <PublishingButton />;
};

export default PublishingButtonClientWrapper;
