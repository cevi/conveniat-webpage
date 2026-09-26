import { hasAdminOrWebAccess } from '@/features/payload-cms/payload-cms/access-rules/roles';
import { enabledLocales, LOCALE } from '@/features/payload-cms/payload-cms/locales';
import type { LexicalNode } from '@/features/payload-cms/payload-cms/services/google-translate';
import {
  translateLexicalRichText,
  translateTexts,
} from '@/features/payload-cms/payload-cms/services/google-translate';
import type { PayloadHandler } from 'payload';

/** One language of an announcement, as it is sent to and returned from this endpoint. */
export interface AnnouncementTranslation {
  title: string;
  content: LexicalNode | null | undefined;
}

/**
 * Machine-translates the German title and body of an announcement into the requested
 * languages.
 *
 * Nothing is saved: the editor fills the result into the form and reviews it before
 * publishing, which is when the announcement is sent to the chat.
 */
export const translateAnnouncementHandler: PayloadHandler = async (request) => {
  if (!hasAdminOrWebAccess({ req: request })) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json?.();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title, content, targetLocales } = (body ?? {}) as Record<string, unknown>;
  if (typeof title !== 'string' || !Array.isArray(targetLocales)) {
    return Response.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  const targets = enabledLocales.filter(
    (locale) => locale !== LOCALE.DE && targetLocales.includes(locale),
  );

  try {
    const translations: Record<string, AnnouncementTranslation> = {};
    for (const locale of targets) {
      const [translatedTitle] =
        title === '' ? [] : await translateTexts([title], locale, LOCALE.DE);
      translations[locale] = {
        title: translatedTitle?.translatedText ?? title,
        content: await translateLexicalRichText(
          content as LexicalNode | null | undefined,
          locale,
          LOCALE.DE,
        ),
      };
    }
    return Response.json({ translations });
  } catch (error) {
    request.payload.logger.error({ error }, 'Failed to translate an announcement');
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ error: message }, { status: 500 });
  }
};
