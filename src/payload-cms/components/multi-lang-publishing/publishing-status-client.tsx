'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui';
import { LanguageStatus } from '@/payload-cms/components/multi-lang-publishing/publishing-status';
import type { PublishingStatusType } from '@/payload-cms/components/multi-lang-publishing/type';

export const PublishingStatusBadges: React.FC<{
  publishingStatus: PublishingStatusType;
}> = ({ publishingStatus }) => {
  return (
    <span>
      {Object.entries(publishingStatus).map(([locale, status]) => (
        <LanguageStatus
          key={locale}
          published={status.published}
          pendingChanges={status.pendingChanges}
          label={locale}
        />
      ))}
    </span>
  );
};

const PublishingStatus: React.FC<{ path: string }> = ({ path }) => {
  const [fields] = useAllFormFields();
  const publishingStatusDefault = fields['publishingStatus']?.value as PublishingStatusType;

  const { id, collectionSlug } = useDocumentInfo();

  const [publishingStatus, setPublishingStatus] =
    useState<PublishingStatusType>(publishingStatusDefault);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      const fetchPublishingStatus = async (): Promise<void> => {
        try {
          const response = await fetch(
            `/api/${collectionSlug}/${id}?depth=0&draft=false?locale=all`,
          );
          const data = (await response.json()) as
            | { publishingStatus: PublishingStatusType | undefined }
            | undefined;
          setPublishingStatus(data?.publishingStatus ?? publishingStatusDefault);
        } catch (error) {
          console.error('Failed to fetch publishing status:', error);
          setPublishingStatus({});
        }
      };

      fetchPublishingStatus().catch(console.error);
    }, 1000);

    return (): void => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [collectionSlug, fields, id, path, publishingStatusDefault]);

  return <PublishingStatusBadges publishingStatus={publishingStatus} />;
};

export default PublishingStatus;
