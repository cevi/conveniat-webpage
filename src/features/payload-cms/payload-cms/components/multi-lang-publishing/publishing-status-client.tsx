'use client';
import { LanguageStatus } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/publishing-status';
import type { PublishingStatusType } from '@/features/payload-cms/payload-cms/components/multi-lang-publishing/type';
import { usePublishingStatus } from '@/features/payload-cms/payload-cms/hooks/use-publishing-status';
import React from 'react';

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

const PublishingStatus: React.FC<{ path: string; isGlobal?: boolean | undefined }> = () => {
  const { publishingStatus } = usePublishingStatus();

  return <PublishingStatusBadges publishingStatus={publishingStatus} />;
};

export default PublishingStatus;
