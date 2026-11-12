import { getImageSubmissionTexts } from '@/features/image-submission/api/image-submission-texts';
import { ImageSubmissionFlow } from '@/features/image-submission/image-submission-flow';
import type { Locale } from '@/types/types';
import { ForceDynamicOnBuild } from '@/utils/is-pre-rendering';
import type React from 'react';

const ImageSubmission: React.FC<{ locale: Locale }> = async ({ locale }) => (
  <ImageSubmissionFlow texts={await getImageSubmissionTexts(locale)} />
);

/** The image upload: its texts come from the `image-submission` global, the flow runs in the browser. */
const ImageUploadPage: React.FC<{ params: Promise<{ locale: Locale }> }> = async ({ params }) => {
  const { locale } = await params;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-6">
      {/* the build has no database, so the texts are read at runtime */}
      <ForceDynamicOnBuild>
        <ImageSubmission locale={locale} />
      </ForceDynamicOnBuild>
    </div>
  );
};

export default ImageUploadPage;
