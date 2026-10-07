import 'server-only';

import { PreviewWarningClient } from '@/components/preview-warning-client';
import { hasAccessToThisUser, Roles } from '@/features/payload-cms/payload-cms/access-rules/roles';
import type { Locale, SearchParameters } from '@/types/types';
import { isValidNextAuthUser } from '@/utils/auth-helpers';
import { getAdminSession } from '@/utils/is-admin-session';
import { PREVIEW_SESSION_COOKIE } from '@/utils/preview-session-cookie';
import { getPreviewTokenId } from '@/utils/preview-token';
import { createLogger } from '@/utils/server-logger';
import { cookies } from 'next/headers';
import type React from 'react';

const logger = createLogger('pages:preview');

/**
 * What a request may preview.
 */
export interface PreviewAccess {
  renderInPreviewMode: boolean;
  /**
   * The one document a shared preview link may show a draft of. Undefined for an editor, who
   * may open every draft. Whoever resolves the document has to hold its id against this one.
   */
  previewDocumentId: string | undefined;
}

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const isEditorPreviewSession = async (): Promise<boolean> => {
  // check if the admin has visited the admin panel in this session
  const cookieStore = await cookies();
  const hasVisitedAdmin = cookieStore.has(PREVIEW_SESSION_COOKIE);
  if (!hasVisitedAdmin) return false;

  const session = await getAdminSession();

  if (session === undefined) return false;

  // check if user is an admin
  const user = session.user;
  if (!isValidNextAuthUser(user)) return false;

  // TODO: does Program Team have access to the preview mode?
  return hasAccessToThisUser({ user, requiredRoles: [Roles.FullAdmin, Roles.WebCoreTeam] });
};

/**
 * Resolves what a request with the `preview` query parameter set to `true` may preview:
 *
 * 1) every draft, if the user has an authenticated admin session AND has visited the admin
 *    panel during the current browser session (indicated by the `payload-admin-visited` cookie)
 * 2) the draft of one document, if the request carries a valid `preview-token` query parameter
 *    (e.g. shared preview link). The document is the one the token was signed for, never the
 *    one the URL names.
 *
 * @param searchParameters
 */
export const resolvePreviewAccess = async (
  searchParameters: SearchParameters,
): Promise<PreviewAccess> => {
  if (await isEditorPreviewSession()) {
    return { renderInPreviewMode: true, previewDocumentId: undefined };
  }

  const previewToken = firstValue(searchParameters['preview-token']);
  if (previewToken === undefined) {
    return { renderInPreviewMode: false, previewDocumentId: undefined };
  }

  const previewDocumentId = getPreviewTokenId(previewToken);
  logger.debug('Validated a preview token', {
    'preview.id': previewDocumentId,
    'preview.valid': previewDocumentId !== undefined,
  });
  return { renderInPreviewMode: previewDocumentId !== undefined, previewDocumentId };
};

export const PreviewWarning: React.FC<{
  params: Promise<{
    locale: Locale;
  }>;
  renderInPreviewMode: boolean;
}> = async ({ params, renderInPreviewMode }) => {
  const { locale } = await params;

  return <PreviewWarningClient locale={locale} renderInPreviewMode={renderInPreviewMode} />;
};
