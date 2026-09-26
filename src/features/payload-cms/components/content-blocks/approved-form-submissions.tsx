import { getApprovedFormSubmissionsCached } from '@/features/payload-cms/api/cached-approved-submissions';
import { ApprovedFormSubmissionsClient } from '@/features/payload-cms/components/content-blocks/approved-form-submissions-client';
import type { ApprovedFormSubmissionsBlock } from '@/features/payload-cms/payload-types';
import { toPublicApprovedSubmissions } from '@/features/payload-cms/utils/public-approved-submissions';
import type { Locale } from '@/types/types';
import React from 'react';

export interface ApprovedFormSubmissionsBlockProperties extends ApprovedFormSubmissionsBlock {
  locale: Locale;
}

export const ApprovedFormSubmissions: React.FC<ApprovedFormSubmissionsBlockProperties> = async ({
  form,
  heading,
  centerHorizontally,
  titleFieldName,
  categoryFieldName,
  fileFieldName,
  searchPlaceholder,
  fileDownloadButtonLabel,
  displayFields,
  locale,
}) => {
  const formId = typeof form === 'object' ? form.id : form;

  const submissions = await getApprovedFormSubmissionsCached(formId);

  // Reduce on the server: the client component's props are serialized into the page.
  const publicSubmissions = toPublicApprovedSubmissions(
    submissions,
    { titleFieldName, categoryFieldName, fileFieldName, displayFields },
    locale,
  );

  return (
    <ApprovedFormSubmissionsClient
      submissions={publicSubmissions}
      heading={heading}
      centerHorizontally={centerHorizontally}
      searchPlaceholder={searchPlaceholder}
      fileDownloadButtonLabel={fileDownloadButtonLabel}
      locale={locale}
    />
  );
};
