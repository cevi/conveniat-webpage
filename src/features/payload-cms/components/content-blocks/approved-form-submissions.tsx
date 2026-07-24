import { getApprovedFormSubmissionsCached } from '@/features/payload-cms/api/cached-approved-submissions';
import { ApprovedFormSubmissionsClient } from '@/features/payload-cms/components/content-blocks/approved-form-submissions-client';
import type { ApprovedFormSubmissionsBlock } from '@/features/payload-cms/payload-types';
import type { Locale } from '@/types/types';
import React from 'react';

export interface ApprovedFormSubmissionsBlockProperties extends ApprovedFormSubmissionsBlock {
  locale: Locale;
}

export const ApprovedFormSubmissions: React.FC<ApprovedFormSubmissionsBlockProperties> = async ({
  form,
  heading,
  titleFieldName,
  categoryFieldName,
  fileFieldName,
  displayFields,
  locale,
}) => {
  const formId = typeof form === 'object' ? form.id : form;

  const submissions = await getApprovedFormSubmissionsCached(formId);

  return (
    <ApprovedFormSubmissionsClient
      submissions={submissions}
      heading={heading}
      titleFieldName={titleFieldName}
      categoryFieldName={categoryFieldName}
      fileFieldName={fileFieldName}
      displayFields={displayFields}
      locale={locale}
    />
  );
};
