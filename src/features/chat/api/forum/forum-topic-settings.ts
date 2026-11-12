import {
  describeFunktionen,
  getFunktionDirectory,
  toFunktionIds,
} from '@/features/payload-cms/payload-cms/utils/funktionen';
import { FORUM_TOPIC_ICONS, type ForumTopicIcon } from '@/lib/forum-shared';
import { readFeatureFlag } from '@/lib/read-feature-flags';
import type { Locale } from '@/types/types';
import config from '@payload-config';
import { getPayload } from 'payload';

/** What editors set on a forum topic in the admin panel, beyond its name and audience. */
export interface ForumTopicSettings {
  icon: ForumTopicIcon;
  allowsPrivateConversations: boolean;
  /** new posts wait for a moderator: the topic's checkbox, or the switch for every topic */
  moderationRequired: boolean;
  /** the labels of its Kernteam functions, e.g. "Ressortleitung Infrastruktur" */
  kernteamLabels: string[];
}

const DEFAULT_SETTINGS: ForumTopicSettings = {
  icon: 'message-circle',
  allowsPrivateConversations: false,
  moderationRequired: false,
  kernteamLabels: [],
};

const toIcon = (value: unknown): ForumTopicIcon =>
  FORUM_TOPIC_ICONS.find((icon) => icon === value) ?? 'message-circle';

/**
 * The settings of the topics behind `chatUuids`, by chat. A chat without a topic document, one
 * an editor deleted while its chat lingers, gets the defaults: no private conversations.
 *
 * @param locale - for the Kernteam labels; without it they stay empty and nothing is looked up
 */
export const findForumTopicSettings = async (
  chatUuids: string[],
  locale?: Locale,
): Promise<Map<string, ForumTopicSettings>> => {
  if (chatUuids.length === 0) return new Map();
  const payload = await getPayload({ config });
  const [{ docs }, approvalEverywhere, directory] = await Promise.all([
    payload.find({
      collection: 'forum-topics',
      where: { chatUuid: { in: chatUuids } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: {
        chatUuid: true,
        icon: true,
        allowsPrivateConversations: true,
        moderationRequired: true,
        kernteamFunktionen: true,
      },
    }),
    readFeatureFlag('forumModerationRequired'),
    locale === undefined ? undefined : getFunktionDirectory(payload, locale),
  ]);
  const settings = new Map<string, ForumTopicSettings>(
    chatUuids.map((uuid) => [uuid, { ...DEFAULT_SETTINGS, moderationRequired: approvalEverywhere }]),
  );
  for (const doc of docs) {
    if (typeof doc.chatUuid !== 'string') continue;
    settings.set(doc.chatUuid, {
      icon: toIcon(doc.icon),
      // a topic saved before the field existed has none, and the field's default is on
      allowsPrivateConversations: doc.allowsPrivateConversations !== false,
      moderationRequired: approvalEverywhere || doc.moderationRequired === true,
      kernteamLabels:
        directory === undefined
          ? []
          : describeFunktionen(toFunktionIds(doc.kernteamFunktionen), directory),
    });
  }
  return settings;
};
