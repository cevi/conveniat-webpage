import { TagContent } from '@/features/wristbands/components/tag-content';
import { TagSheet } from '@/features/wristbands/components/tag-sheet';
import type { Locale } from '@/types/types';
import type { DesignCodes } from '@/utils/design-codes';
import type React from 'react';

/**
 * A band tapped while the app is open: the native app hands the link to the page, see
 * `useAppWebViewNavigate`, and the router opens it here, as a sheet over whatever page is open.
 * `(.)` because the route group and the slot are no segments: `tag` sits on the level of `app`.
 */
const TagSheetOverPage: React.FC<{
  params: Promise<{ uid: string; locale: Locale; design: DesignCodes }>;
}> = ({ params }) => (
  <TagSheet closeTo="back">
    <TagContent params={params} />
  </TagSheet>
);

export default TagSheetOverPage;
