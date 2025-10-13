'use client';
import { LanguageStatus } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status';
import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { useAllFormFields, useDocumentInfo } from '@payloadcms/ui';
import React, { useEffect, useRef, useState } from 'react';

export const PublishingStatusBadges: React.FC<{
  publishingStatus: PublishingStatusType | undefined;
}> = ({ publishingStatus }) => {
  if (publishingStatus === undefined) {
    return <></>;
  }

  return (
    <div className="w-[120px] min-w-[120px]">
      {Object.entries(publishingStatus).map(([locale, status]) => (
        <LanguageStatus
          key={locale}
          published={status.published}
          pendingChanges={status.pendingChanges}
          label={locale}
        />
      ))}
    </div>
  );
};

const PublishingStatus: React.FC<{ path: string; isGlobal?: boolean | undefined }> = ({
  path,
  isGlobal = false,
}) => {
  const [fields] = useAllFormFields();
  const publishingStatusDefault = fields['publishingStatus']?.value as PublishingStatusType;

  const { id, collectionSlug, globalSlug } = useDocumentInfo();

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
          const response = await (isGlobal
            ? fetch(`/api/globals/${globalSlug}?depth=0&draft=false?locale=all`)
            : fetch(`/api/${collectionSlug}/${id}?depth=0&draft=false?locale=all`));
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
  }, [collectionSlug, globalSlug, isGlobal, fields, id, path, publishingStatusDefault]);

  return <PublishingStatusBadges publishingStatus={publishingStatus} />;
};

export default PublishingStatus;
