import { RefreshRouteOnSave } from '@/components/utils/refresh-preview';
import { environmentVariables } from '@/config/environment-variables';
import { AnnouncementChatPreview } from '@/features/chat/components/chat-view/announcement-chat-preview';
import { buildAnnouncementMessagePayload } from '@/features/payload-cms/payload-cms/utils/announcement-message-payload';
import type { Announcement } from '@/features/payload-cms/payload-types';
import configPromise from '@/features/payload-cms/payload.config';
import { resolvePreviewAccess } from '@/features/payload-cms/utils/preview/preview-utils';
import type { Locale, SearchParameters } from '@/types/types';
import { i18nConfig } from '@/types/types';
import { forceDynamicOnBuild } from '@/utils/is-pre-rendering';
import { createLogger } from '@/utils/server-logger';
import type { JsonObject } from '@prisma/client/runtime/client';
import { notFound } from 'next/navigation';
import { getPayload } from 'payload';
import type React from 'react';

const logger = createLogger('announcements:preview');

/** Everything here depends on the editor's session and the draft, so nothing can be prerendered. */
export const instant = false;

/** What the chat header shows while the announcement has no channel yet. */
const unnamedChannel = {
  de: 'Ankündigungskanal',
  en: 'Announcement channel',
  fr: "Canal d'annonces",
} as const;

interface PageProperties {
  params: Promise<{
    id: string;
    locale: Locale;
    design: string;
  }>;
  searchParams: Promise<SearchParameters>;
}

/**
 * The live preview of an announcement: its channel as a member sees it in the app, with the
 * draft as the latest message, in the language the admin panel is set to. The proxy renders
 * this route in the app's design.
 */
export default async function AnnouncementPreviewPage({
  params,
  searchParams,
}: PageProperties): Promise<React.JSX.Element> {
  if (await forceDynamicOnBuild()) {
    return <></>;
  }

  // The app route group is served to anonymous visitors, and this page reads drafts, so it
  // needs the same gate as every other preview: `?preview=true` and either a valid preview
  // token or an editor session. A token only opens the announcement it was minted for.
  const searchParameters = await searchParams;
  const previewParameter = searchParameters['preview'];
  const isPreviewRequested =
    previewParameter === 'true' ||
    (Array.isArray(previewParameter) && previewParameter[0] === 'true');
  if (!isPreviewRequested) notFound();

  const { id, locale } = await params;
  const { renderInPreviewMode, previewDocumentId } = await resolvePreviewAccess(searchParameters);
  if (!renderInPreviewMode || (previewDocumentId !== undefined && previewDocumentId !== id)) {
    notFound();
  }

  const validatedLocale: Locale = i18nConfig.locales.includes(locale) ? locale : 'de';

  const payload = await getPayload({ config: configPromise });

  let announcement: Announcement | undefined;
  try {
    announcement = await payload.findByID({
      collection: 'announcements',
      id,
      // Populates the channel; the images are loaded again by the payload builder.
      depth: 1,
      draft: true, // Fetch drafts or autosaved edits to power the live preview
    });
  } catch (error) {
    // A deleted or mistyped id lands here too, so this is not worth an error.
    logger.warn('Failed to load an announcement for the live preview', {
      error,
      'announcement.id': id,
    });
  }

  if (announcement === undefined) {
    notFound();
  }

  // The payload the announcement is stored with when it is published, so the bubble shows
  // what members will read, with the chat's own fallback for a language left empty.
  const messagePayload = await buildAnnouncementMessagePayload({
    payload,
    announcement,
    imageReferences: announcement.images,
  });

  // A draft may not have a channel yet, and a populated one is an object.
  const channel = typeof announcement.channel === 'object' ? announcement.channel : undefined;
  const chatName =
    channel?.name !== undefined && channel.name !== ''
      ? channel.name
      : unnamedChannel[validatedLocale];

  const sentAt =
    announcement.publishedAt ??
    (announcement.status === 'scheduled' ? announcement.scheduledAt : undefined) ??
    new Date().toISOString();

  return (
    <>
      <RefreshRouteOnSave serverURL={environmentVariables.APP_HOST_URL} />
      <AnnouncementChatPreview
        chatName={chatName}
        messagePayload={messagePayload as unknown as JsonObject}
        sentAt={sentAt}
        locale={validatedLocale}
      />
    </>
  );
}
